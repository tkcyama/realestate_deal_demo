import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type SaleOffer, type PurchaseOffer } from '@/types'
import OffersTabs from './offers-tabs'

export const dynamic = 'force-dynamic'

export default async function OffersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: receivedSaleOffers },
    { data: sentSaleOffers },
    { data: sentPurchaseOffers },
    { data: receivedPurchaseOffers },
  ] = await Promise.all([
    supabase
      .from('sale_offers')
      .select(`*, properties(id, name, address, use_type, price, noi_yield), sender:profiles!sale_offers_sender_id_fkey(id, company_name, full_name)`)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('sale_offers')
      .select(`*, properties(id, name, address, use_type, price, noi_yield), recipient:profiles!sale_offers_recipient_id_fkey(id, company_name, full_name)`)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('purchase_offers')
      .select(`*, properties(id, name, address, use_type, price), seller:profiles!purchase_offers_seller_id_fkey(id, company_name, full_name)`)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('purchase_offers')
      .select(`*, properties(id, name, address, use_type, price), buyer:profiles!purchase_offers_buyer_id_fkey(id, company_name, full_name)`)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">オファー管理</h1>
      <Suspense>
        <OffersTabs
          rSale={(receivedSaleOffers ?? []) as SaleOffer[]}
          sSale={(sentSaleOffers ?? []) as SaleOffer[]}
          sPurchase={(sentPurchaseOffers ?? []) as PurchaseOffer[]}
          rPurchase={(receivedPurchaseOffers ?? []) as PurchaseOffer[]}
        />
      </Suspense>
    </div>
  )
}
