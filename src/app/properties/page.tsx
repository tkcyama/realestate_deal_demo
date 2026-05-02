import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPropertyPrice, formatYield, formatArea } from '@/lib/format'
import { PropertyFilters } from './property-filters'
import {
  USE_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  type Property,
  type PropertyStatus,
} from '@/types'

const STATUS_STYLE: Record<PropertyStatus, string> = {
  draft:            'bg-gray-100 text-gray-600',
  pending_approval: 'bg-amber-100 text-amber-700',
  published:        'bg-green-100 text-green-700',
  sold:             'bg-blue-100 text-blue-700',
}

type SearchParams = {
  q?: string
  use_type?: string
  prefecture?: string
  price_min?: string
  price_max?: string
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // フィルター条件を共通関数で適用
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(query: any): any {
    let q = query
    if (params.q) {
      const like = `%${params.q}%`
      q = q.or(`name.ilike.${like},address.ilike.${like}`)
    }
    if (params.use_type) q = q.eq('use_type', params.use_type)
    if (params.prefecture) q = q.ilike('prefecture', `%${params.prefecture}%`)
    if (params.price_min) q = q.gte('price', Number(params.price_min) * 1_0000_0000)
    if (params.price_max) q = q.lte('price', Number(params.price_max) * 1_0000_0000)
    return q
  }

  // 自分の物件（全ステータス）
  const ownBase = supabase
    .from('properties')
    .select('*, profiles(company_name, full_name)')
    .eq('seller_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const { data: ownProperties } = await applyFilters(ownBase)

  // 公開中物件（他者）
  const pubBase = supabase
    .from('properties')
    .select('*, profiles(company_name, full_name)')
    .eq('status', 'published')
    .neq('seller_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const { data: publishedProperties } = await applyFilters(pubBase)

  const own = (ownProperties ?? []) as Property[]
  const published = (publishedProperties ?? []) as Property[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">物件管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            保有物件の管理と公開中物件の閲覧
          </p>
        </div>
        <Link href="/properties/new">
          <Button className="bg-[#1F3864] hover:bg-[#162a4e]">
            + 物件を登録する
          </Button>
        </Link>
      </div>

      {/* フィルター */}
      <Suspense>
        <PropertyFilters
          q={params.q}
          use_type={params.use_type}
          prefecture={params.prefecture}
          price_min={params.price_min}
          price_max={params.price_max}
        />
      </Suspense>

      {/* 保有物件 */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          保有物件{' '}
          <span className="text-gray-400 font-normal text-sm">({own.length}件)</span>
        </h2>
        {own.length === 0 ? (
          <EmptyState message="条件に合う物件がありません" />
        ) : (
          <PropertyGrid properties={own} showStatus />
        )}
      </section>

      {/* 公開中物件 */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          公開中物件（他社）{' '}
          <span className="text-gray-400 font-normal text-sm">({published.length}件)</span>
        </h2>
        {published.length === 0 ? (
          <EmptyState message="条件に合う公開中物件はありません" />
        ) : (
          <PropertyGrid properties={published} />
        )}
      </section>
    </div>
  )
}

function PropertyGrid({
  properties,
  showStatus,
}: {
  properties: Property[]
  showStatus?: boolean
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {properties.map((p) => (
        <Link
          key={p.id}
          href={`/properties/${p.id}`}
          className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{p.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{p.address}</p>
            </div>
            {showStatus && (
              <span
                className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status]}`}
              >
                {PROPERTY_STATUS_LABELS[p.status]}
              </span>
            )}
          </div>

          <div className="flex gap-2 mb-3">
            <Badge variant="outline" className="text-xs">
              {USE_TYPE_LABELS[p.use_type]}
            </Badge>
            {p.building_year && (
              <Badge variant="outline" className="text-xs text-gray-500">
                {p.building_year}年築
              </Badge>
            )}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">売却希望価格</span>
              <span className="font-semibold text-gray-900">{formatPropertyPrice(p.price)}</span>
            </div>
            {p.noi_yield != null && (
              <div className="flex justify-between">
                <span className="text-gray-500">NOI利回り</span>
                <span className="text-gray-700">{formatYield(p.noi_yield)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">延床面積</span>
              <span className="text-gray-700">
                {formatArea(p.total_floor_area_sqm, null)}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
      {message}
    </div>
  )
}
