import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatPrice, formatYield } from '@/lib/format'
import { USE_TYPE_LABELS, type Property } from '@/types'
import { PropertyApprovalActions } from './property-approval-actions'

export default async function AdminPropertiesPage() {
  const supabase = await createClient()

  const { data: pending } = await supabase
    .from('properties')
    .select('*, profiles(company_name, full_name)')
    .eq('status', 'pending_approval')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const { data: published } = await supabase
    .from('properties')
    .select('*, profiles(company_name, full_name)')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">物件承認管理</h1>
      </div>

      {/* 承認待ち */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
          承認待ち
          {(pending?.length ?? 0) > 0 && (
            <span className="bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">
              {pending!.length}
            </span>
          )}
        </h2>
        <PropertyTable properties={pending ?? []} showActions />
      </section>

      {/* 公開中 */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">公開中</h2>
        <PropertyTable properties={published ?? []} />
      </section>
    </div>
  )
}

function PropertyTable({
  properties,
  showActions,
}: {
  properties: any[]
  showActions?: boolean
}) {
  if (properties.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
        該当する物件がありません
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">物件名</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">売主</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">用途</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">価格</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">NOI利回り</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {properties.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/properties/${p.id}`}
                  className="font-medium text-[#1F3864] hover:underline"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">{p.address}</p>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {p.profiles?.company_name}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {USE_TYPE_LABELS[p.use_type as keyof typeof USE_TYPE_LABELS]}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatPrice(p.price)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                {formatYield(p.noi_yield)}
              </td>
              <td className="px-4 py-3">
                {showActions && (
                  <PropertyApprovalActions propertyId={p.id} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
