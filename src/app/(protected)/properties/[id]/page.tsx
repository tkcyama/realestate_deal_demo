import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  USE_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  SALE_OFFER_STATUS_LABELS,
  type Property,
  type PropertyStatus,
  type SaleOfferStatus,
} from '@/types'
import { formatPropertyPrice, formatPrice, formatYield, formatArea, formatNumber } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PropertyStatusActions } from './property-status-actions'

const STATUS_STYLE: Record<PropertyStatus, string> = {
  draft:            'bg-gray-100 text-gray-600 border-gray-200',
  pending_approval: 'bg-amber-100 text-amber-700 border-amber-200',
  published:        'bg-green-100 text-green-700 border-green-200',
  sold:             'bg-blue-100 text-blue-700 border-blue-200',
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: property } = await supabase
    .from('properties')
    .select('*, profiles(company_name, full_name, email)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!property) notFound()

  const p = property as Property & {
    profiles: { company_name: string; full_name: string; email: string }
  }

  const isOwner = p.seller_id === user.id

  // 詳細アクセス権チェック（売主 or 管理者 or 検討中オファー保持者）
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  let hasDetailAccess = isOwner || profile?.is_admin

  // 自分が受信した売却オファーの状態を確認
  let mySaleOffer: { id: string; status: SaleOfferStatus } | null = null
  if (!hasDetailAccess) {
    const { data: offer } = await supabase
      .from('sale_offers')
      .select('id, status')
      .eq('property_id', id)
      .eq('recipient_id', user.id)
      .in('status', ['pending', 'considering'])
      .maybeSingle()
    mySaleOffer = offer as { id: string; status: SaleOfferStatus } | null
    hasDetailAccess = mySaleOffer?.status === 'considering'
  }

  // 取引合意済みチェック（RLSをバイパスするSECURITY DEFINER関数を使用）
  const { data: isAgreed } = await supabase
    .rpc('check_property_has_agreed_offer', { p_property_id: id })

  const s = STATUS_STYLE[p.status]

  return (
    <div className="p-8 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{p.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${s}`}>
              {PROPERTY_STATUS_LABELS[p.status]}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{p.address}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{USE_TYPE_LABELS[p.use_type]}</Badge>
            {p.building_year && (
              <Badge variant="outline" className="text-gray-500">
                {p.building_year}年築
              </Badge>
            )}
            {p.structure && (
              <Badge variant="outline" className="text-gray-500">{p.structure}</Badge>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex gap-2">
            {(p.status === 'draft' || p.status === 'pending_approval') && (
              <Link href={`/properties/${p.id}/edit`}>
                <Button variant="outline" size="sm">編集</Button>
              </Link>
            )}
            <PropertyStatusActions propertyId={p.id} currentStatus={p.status} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左カラム：主要指標 */}
        <div className="col-span-2 space-y-6">
          {/* 価格・利回り */}
          <InfoCard title="価格・利回り">
            <MetricGrid>
              <Metric label="売却希望価格" value={formatPropertyPrice(p.price)} highlight />
              <Metric label="NOI利回り" value={formatYield(p.noi_yield)} />
              <Metric label="NCF利回り" value={formatYield(p.ncf_yield)} />
              <Metric label="専有坪単価" value={
                p.exclusive_tsubo_price
                  ? `${p.exclusive_tsubo_price.toLocaleString()}円/坪`
                  : '—'
              } />
            </MetricGrid>
          </InfoCard>

          {/* 面積 */}
          <InfoCard title="面積情報">
            <MetricGrid>
              <Metric label="延床面積" value={formatArea(p.total_floor_area_sqm, null)} />
              <Metric
                label="専有面積"
                value={formatArea(p.exclusive_area_sqm, p.exclusive_area_tsubo)}
              />
              {p.land_area_sqm && (
                <Metric label="土地面積" value={`${p.land_area_sqm.toFixed(1)}㎡`} />
              )}
              {(p.floors_above || p.floors_below) && (
                <Metric
                  label="階数"
                  value={[
                    p.floors_above ? `地上${p.floors_above}階` : '',
                    p.floors_below ? `地下${p.floors_below}階` : '',
                  ].filter(Boolean).join(' / ')}
                />
              )}
            </MetricGrid>
          </InfoCard>

          {/* 収支詳細（アクセス権がある場合のみ） */}
          {hasDetailAccess ? (
            <InfoCard title="収支情報">
              <MetricGrid>
                <Metric
                  label="NOI（年間純収益）"
                  value={formatPrice(p.noi)}
                />
                <Metric
                  label="NCF（純キャッシュフロー）"
                  value={formatPrice(p.ncf)}
                />
                <Metric
                  label="月額賃料収入"
                  value={formatPrice(p.monthly_rent_income)}
                />
                <Metric
                  label="テナント数"
                  value={formatNumber(p.tenant_count, '社')}
                />
                <Metric
                  label="稼働率"
                  value={p.occupancy_rate ? `${p.occupancy_rate}%` : '—'}
                />
              </MetricGrid>
            </InfoCard>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-dashed p-6 text-center">
              <p className="text-sm text-gray-500">
                収支詳細・RR資料はオファー受諾後に閲覧できます
              </p>
            </div>
          )}
        </div>

        {/* 右カラム：売主情報 */}
        <div className="space-y-4">
          {(isOwner || profile?.is_admin || p.status === 'published') && (
            <InfoCard title="売主情報">
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">{p.profiles.company_name}</p>
                <p className="text-gray-500">{p.profiles.full_name}</p>
                {(isOwner || profile?.is_admin) && (
                  <p className="text-gray-500 text-xs">{p.profiles.email}</p>
                )}
              </div>
            </InfoCard>
          )}

          {/* 非所有者向けオファーパネル */}
          {!isOwner && p.status === 'published' && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              {/* 取引合意済み */}
              {isAgreed ? (
                <div className="text-center py-1">
                  <span className="inline-block text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                    取引合意済みです
                  </span>
                </div>
              ) : (
                <>
                  {/* 売却オファー未受信 → 売主がオファーを送る案内 */}
                  {!mySaleOffer && (
                    <p className="text-sm text-gray-500">
                      売主からオファーが届いた場合、ここで確認できます
                    </p>
                  )}

                  {/* 返答待ち */}
                  {mySaleOffer?.status === 'pending' && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-yellow-700">
                        売却オファーが届いています
                      </p>
                      <Link href="/offers">
                        <Button size="sm" className="w-full">オファーを確認・返答する</Button>
                      </Link>
                    </div>
                  )}

                  {/* 検討中 → 購入オファーを送れる */}
                  {mySaleOffer?.status === 'considering' && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-700">
                        検討中のオファー
                      </p>
                      <Link href={`/offers/purchase/new?saleOfferId=${mySaleOffer.id}&propertyId=${p.id}`}>
                        <Button size="sm" className="w-full bg-[#C00000] hover:bg-[#900000]">
                          購入オファーを送る
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 売主向け：この物件にオファーを送信するリンク */}
          {isOwner && p.status === 'published' && (
            <div className="bg-white rounded-xl border p-4">
              {isAgreed ? (
                <div className="text-center py-1">
                  <span className="inline-block text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                    取引合意済みです
                  </span>
                </div>
              ) : (
                <Link href={`/offers/sale/new?propertyId=${p.id}`}>
                  <Button size="sm" className="w-full" variant="outline">
                    売却オファーを送信する
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link href="/properties" className="text-sm text-[#1F3864] hover:underline">
          ← 物件一覧に戻る
        </Link>
      </div>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b text-sm">{title}</h3>
      {children}
    </div>
  )
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-lg font-bold text-gray-900' : 'text-gray-700'}`}>
        {value}
      </p>
    </div>
  )
}
