'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── 売却オファー送信（複数宛先対応） ────────────────────────
export async function sendSaleOffer(params: {
  propertyId: string
  recipientIds: string[]
  message: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { propertyId, recipientIds, message } = params

  if (!recipientIds.length) return { error: '送信先を1件以上選択してください' }

  // 既にオファー済みの宛先を一括チェック
  const { data: existing } = await supabase
    .from('sale_offers')
    .select('recipient_id')
    .eq('property_id', propertyId)
    .in('recipient_id', recipientIds)
    .in('status', ['pending', 'considering'])

  const alreadySentIds = new Set((existing ?? []).map((r) => r.recipient_id))
  const targets = recipientIds.filter((id) => !alreadySentIds.has(id))

  if (!targets.length) {
    return { error: '選択した会員全員にすでにオファーを送信済みです' }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 14)

  const rows = targets.map((recipientId) => ({
    property_id:  propertyId,
    sender_id:    user.id,
    recipient_id: recipientId,
    message:      message || null,
    expires_at:   expiresAt.toISOString(),
  }))

  const { error } = await supabase.from('sale_offers').insert(rows)
  if (error) return { error: error.message }

  // 通知を一括作成
  await supabase.from('notifications').insert(
    targets.map((recipientId) => ({
      user_id: recipientId,
      type:    'sale_offer_received',
      message: '売却オファーが届きました',
    }))
  )

  revalidatePath('/offers')
  return {
    success: true,
    sent: targets.length,
    skipped: alreadySentIds.size,
  }
}

// ── 売却オファー返答（買主） ─────────────────────────────────
export async function respondSaleOffer(offerId: string, status: 'considering' | 'declined') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: offer } = await supabase
    .from('sale_offers')
    .select('id, sender_id, status')
    .eq('id', offerId)
    .eq('recipient_id', user.id)
    .single()

  if (!offer) return { error: 'オファーが見つかりません' }

  // pending → considering/declined、または considering → declined のみ許可
  if (offer.status === 'pending' && status === 'considering') {
    // OK
  } else if (offer.status === 'pending' && status === 'declined') {
    // OK
  } else if (offer.status === 'considering' && status === 'declined') {
    // 詳細資料確認後の見送り
  } else {
    return { error: 'この操作はできません' }
  }

  const { error } = await supabase
    .from('sale_offers')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', offerId)

  if (error) return { error: error.message }

  await supabase.from('notifications').insert({
    user_id: offer.sender_id,
    type:    'sale_offer_responded',
    ref_id:  offerId,
    message: status === 'considering'
      ? '売却オファーに「検討する」と返答がありました'
      : '売却オファーが見送られました',
  })

  revalidatePath('/offers')
  return { success: true }
}

// ── 購入オファー送信 ─────────────────────────────────────────
export async function sendPurchaseOffer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const propertyId   = formData.get('property_id') as string
  const saleOfferId  = formData.get('sale_offer_id') as string | null
  const sellerId     = formData.get('seller_id') as string
  const offerPriceOku = parseFloat(formData.get('offer_price_oku') as string)
  const conditions   = formData.get('conditions') as string | null
  const message      = formData.get('message') as string | null

  if (isNaN(offerPriceOku) || offerPriceOku <= 0) return { error: '希望価格を正しく入力してください' }

  // 物件レベル：他の買主との取引が合意済みであれば送信不可
  // 直接クエリはRLSで他の買主のレコードが見えないためSECURITY DEFINER関数を使用
  // RPC失敗時はフェイルセーフとしてブロック
  const { data: hasAgreed, error: agreedRpcError } = await supabase
    .rpc('check_property_has_agreed_offer', { p_property_id: propertyId })

  if (agreedRpcError) return { error: '合意状況の確認に失敗しました。再度お試しください。' }
  if (hasAgreed) return { error: 'この物件はすでに取引合意済みのため、新しいオファーは送信できません' }

  // 買主レベル：自分の未解決オファー（合意済み含む）があれば二重送信を禁止
  const { data: existing } = await supabase
    .from('purchase_offers')
    .select('id')
    .eq('property_id', propertyId)
    .eq('buyer_id', user.id)
    .in('status', ['pending', 'counter_offered', 'accepted', 'agreed'])
    .maybeSingle()

  if (existing) return { error: 'この物件にはすでにオファーを送信済みです。売主の返答をお待ちください。' }

  const offerPrice = Math.round(offerPriceOku * 100_000_000)
  const expiresAt  = new Date()
  expiresAt.setDate(expiresAt.getDate() + 14)

  const { error } = await supabase.from('purchase_offers').insert({
    property_id:   propertyId,
    sale_offer_id: saleOfferId || null,
    buyer_id:      user.id,
    seller_id:     sellerId,
    offer_price:   offerPrice,
    conditions:    conditions || null,
    message:       message || null,
    expires_at:    expiresAt.toISOString(),
  })

  if (error) return { error: error.message }

  await supabase.from('notifications').insert({
    user_id: sellerId,
    type:    'purchase_offer_received',
    message: '購入オファーが届きました',
  })

  revalidatePath('/offers')
  return { success: true }
}

// ── 購入オファー返答（売主） ─────────────────────────────────
export async function respondPurchaseOffer(
  offerId: string,
  action: 'accepted' | 'declined' | 'counter_offered',
  counterData?: { price?: number; conditions?: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: offer } = await supabase
    .from('purchase_offers')
    .select('id, buyer_id, property_id, status')
    .eq('id', offerId)
    .eq('seller_id', user.id)
    .single()

  if (!offer) return { error: 'オファーが見つかりません' }
  if (offer.status !== 'pending') return { error: 'このオファーはすでに返答済みです' }

  const updateData: Record<string, unknown> = {
    status:       action,
    responded_at: new Date().toISOString(),
  }
  if (action === 'counter_offered' && counterData) {
    if (counterData.price) updateData.counter_price = counterData.price
    if (counterData.conditions) updateData.counter_conditions = counterData.conditions
  }

  const { error } = await supabase
    .from('purchase_offers')
    .update(updateData)
    .eq('id', offerId)

  if (error) return { error: error.message }

  const msgMap = {
    accepted:        '購入オファーが承諾されました',
    declined:        '購入オファーが拒否されました',
    counter_offered: '購入オファーに条件変更の提案がありました',
  }

  await supabase.from('notifications').insert({
    user_id: offer.buyer_id,
    type:    'purchase_offer_responded',
    ref_id:  offerId,
    message: msgMap[action],
  })

  // 承諾時：同一物件の他の未解決オファーを一括 declined に
  // （売主の auth context で実行するため RLS が通る）
  if (action === 'accepted') {
    const { data: otherOffers } = await supabase
      .from('purchase_offers')
      .select('id, buyer_id')
      .eq('property_id', offer.property_id)
      .eq('seller_id', user.id)
      .neq('id', offerId)
      .in('status', ['pending', 'counter_offered', 'accepted'])

    if (otherOffers && otherOffers.length > 0) {
      await supabase
        .from('purchase_offers')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .in('id', otherOffers.map(o => o.id))

      await supabase.from('notifications').insert(
        otherOffers.map(o => ({
          user_id: o.buyer_id,
          type:    'purchase_offer_responded',
          message: '他の買主との取引が進んだため、オファーが終了しました',
        }))
      )
    }
  }

  revalidatePath('/offers')
  return { success: true }
}

// ── カウンターオファーへの返答（買主） ──────────────────────
export async function respondCounterOffer(offerId: string, action: 'accepted' | 'declined') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: offer } = await supabase
    .from('purchase_offers')
    .select('id, seller_id, status')
    .eq('id', offerId)
    .eq('buyer_id', user.id)
    .single()

  if (!offer) return { error: 'オファーが見つかりません' }
  if (offer.status !== 'counter_offered') return { error: 'この操作はできません' }

  const { data: updated, error } = await supabase
    .from('purchase_offers')
    .update({ status: action, responded_at: new Date().toISOString() })
    .eq('id', offerId)
    .select('id')
    .single()

  if (error) return { error: error.message }
  if (!updated) return { error: '処理に失敗しました。ページを再読み込みして再度お試しください。' }

  const msgMap = {
    accepted: 'カウンターオファーが承諾されました',
    declined: 'カウンターオファーが拒否されました',
  }

  await supabase.from('notifications').insert({
    user_id: offer.seller_id,
    type:    'purchase_offer_responded',
    ref_id:  offerId,
    message: msgMap[action],
  })

  revalidatePath('/offers')
  return { success: true }
}

// ── 取引合意（買主が承諾済みオファーを合意確定） ─────────────
export async function agreeOffer(offerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { data: offer } = await supabase
    .from('purchase_offers')
    .select('id, seller_id, property_id, status')
    .eq('id', offerId)
    .eq('buyer_id', user.id)
    .single()

  if (!offer) return { error: 'オファーが見つかりません' }
  if (offer.status !== 'accepted') return { error: '承諾済みのオファーのみ合意できます' }

  // 同一物件で既に合意済みのオファーがある場合は二重合意を防止
  // RLSでは買主が他の買主のレコードを参照できないため SECURITY DEFINER 関数で確認
  // RPC失敗時はフェイルセーフとしてブロック
  const { data: hasAgreed, error: agreedRpcError } = await supabase
    .rpc('check_property_has_agreed_offer', { p_property_id: offer.property_id })

  if (agreedRpcError) return { error: '合意状況の確認に失敗しました。再度お試しください。' }
  if (hasAgreed) return { error: 'この物件はすでに他の買主と取引合意済みです' }

  const { data: updated, error } = await supabase
    .from('purchase_offers')
    .update({ status: 'agreed', agreed_at: new Date().toISOString() })
    .eq('id', offerId)
    .select('id')
    .single()

  if (error) return { error: error.message }
  if (!updated) return { error: '合意の確定に失敗しました。ページを再読み込みして再度お試しください。' }

  await supabase.from('notifications').insert({
    user_id: offer.seller_id,
    type:    'purchase_offer_responded',
    ref_id:  offerId,
    message: '取引合意が確定しました',
  })

  revalidatePath('/offers')
  return { success: true }
}

// ── 通知を既読にする ─────────────────────────────────────────
export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  revalidatePath('/notifications')
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  revalidatePath('/notifications')
}
