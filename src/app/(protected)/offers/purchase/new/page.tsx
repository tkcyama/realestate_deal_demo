import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PurchaseOfferForm from './purchase-offer-form'

type Props = {
  searchParams: Promise<{ saleOfferId?: string; propertyId?: string }>
}

const ACTIVE_STATUSES = ['pending', 'counter_offered', 'accepted', 'agreed'] as const

const STATUS_LABELS: Record<string, string> = {
  pending:        '売主の返答待ち',
  counter_offered: '売主から条件変更の提案あり',
  accepted:       '売主が承諾済み（合意確定をお待ちください）',
  agreed:         '取引合意済み',
}

export default async function NewPurchaseOfferPage({ searchParams }: Props) {
  const { saleOfferId, propertyId } = await searchParams
  if (!propertyId) redirect('/offers')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 売却オファー確認（saleOfferId がある場合）
  let saleOffer: { id: string; property_id: string; sender_id: string } | null = null
  if (saleOfferId) {
    const { data } = await supabase
      .from('sale_offers')
      .select('id, property_id, sender_id, status')
      .eq('id', saleOfferId)
      .eq('recipient_id', user.id)
      .eq('status', 'considering')
      .single()
    saleOffer = data
    if (!saleOffer) redirect('/offers')
  }

  // 物件情報取得
  const { data: property } = await supabase
    .from('properties')
    .select('id, name, address, use_type, price, seller_id, noi_yield, ncf_yield')
    .eq('id', propertyId)
    .eq('status', 'published')
    .single()

  if (!property) redirect('/offers')
  if (property.seller_id === user.id) redirect('/offers')

  // 物件レベル：他の買主との合意済み取引があれば全員ブロック
  // 直接クエリはRLSで他の買主のレコードが見えないためSECURITY DEFINER関数を使用
  // RPC失敗時はフェイルセーフとしてブロック扱い
  const { data: isAgreed, error: rpcError } = await supabase
    .rpc('check_property_has_agreed_offer', { p_property_id: propertyId })
  const agreedDeal = isAgreed || rpcError != null

  // 買主レベル：自分の未解決オファー（合意済み含む）
  const { data: existingOffer } = agreedDeal
    ? { data: null }
    : await supabase
        .from('purchase_offers')
        .select('id, status')
        .eq('property_id', propertyId)
        .eq('buyer_id', user.id)
        .in('status', ACTIVE_STATUSES)
        .maybeSingle()

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">購入オファー送信</h1>
        <p className="mt-1 text-sm text-gray-500">
          物件: <span className="font-medium text-gray-700">{property.name}</span>
        </p>
      </div>

      {agreedDeal ? (
        <div className="space-y-4">
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-4 text-sm text-red-800">
            <p className="font-semibold mb-1">この物件は取引合意済みです</p>
            <p>すでに他の買主との取引が合意済みのため、新しい購入オファーは送信できません。</p>
          </div>
          <Link href="/offers" className="inline-block text-sm text-blue-600 hover:underline">
            オファー一覧に戻る
          </Link>
        </div>
      ) : existingOffer ? (
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">オファー送信済みです</p>
            <p>この物件にはすでにオファーを送信しています。</p>
            <p className="mt-1">現在のステータス: <span className="font-medium">{STATUS_LABELS[existingOffer.status] ?? existingOffer.status}</span></p>
            <p className="mt-2 text-amber-700">売主がオファーを処理するまで、新しいオファーは送信できません。</p>
          </div>
          <Link href="/offers" className="inline-block text-sm text-blue-600 hover:underline">
            オファー一覧に戻る
          </Link>
        </div>
      ) : (
        <PurchaseOfferForm
          property={property}
          saleOfferId={saleOffer?.id ?? null}
        />
      )}
    </div>
  )
}
