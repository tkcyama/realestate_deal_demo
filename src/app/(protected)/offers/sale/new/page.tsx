import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SaleOfferForm from './sale-offer-form'

type Props = {
  searchParams: Promise<{ propertyId?: string }>
}

export default async function NewSaleOfferPage({ searchParams }: Props) {
  const { propertyId } = await searchParams
  if (!propertyId) redirect('/properties')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 自分の公開中物件か確認
  const { data: property } = await supabase
    .from('properties')
    .select('id, name, address, use_type, price, status')
    .eq('id', propertyId)
    .eq('seller_id', user.id)
    .eq('status', 'published')
    .single()

  if (!property) redirect('/properties')

  // 承認済み会員（自分以外）をリストアップ
  const { data: members } = await supabase
    .from('profiles')
    .select('id, company_name, full_name, roles')
    .eq('status', 'approved')
    .neq('id', user.id)
    .is('deleted_at', null)
    .order('company_name')

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">売却オファー送信</h1>
        <p className="mt-1 text-sm text-gray-500">
          物件: <span className="font-medium text-gray-700">{property.name}</span>
        </p>
      </div>
      <SaleOfferForm
        property={property}
        members={members ?? []}
      />
    </div>
  )
}
