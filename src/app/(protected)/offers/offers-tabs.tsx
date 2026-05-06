'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPropertyPrice } from '@/lib/format'
import {
  SALE_OFFER_STATUS_LABELS,
  PURCHASE_OFFER_STATUS_LABELS,
  type SaleOffer,
  type PurchaseOffer,
} from '@/types'
import SaleOfferActions from './sale-offer-actions'
import PurchaseOfferActions from './purchase-offer-actions'
import CounterOfferActions from './counter-offer-actions'
import AgreeButton from './agree-button'

type Props = {
  rSale: SaleOffer[]
  sSale: SaleOffer[]
  sPurchase: PurchaseOffer[]
  rPurchase: PurchaseOffer[]
}

const SALE_ACTIVE: string[]    = ['pending', 'considering']
const PURCHASE_ACTIVE: string[] = ['pending', 'counter_offered', 'accepted']
const TERMINAL: string[]        = ['declined', 'expired']

type TabValue = 'active' | 'agreed' | 'history'
const VALID_TABS: TabValue[] = ['active', 'agreed', 'history']

export default function OffersTabs({ rSale, sSale, sPurchase, rPurchase }: Props) {
  const searchParams = useSearchParams()
  const paramTab = searchParams.get('tab') as TabValue
  const [tab, setTab] = useState<TabValue>(VALID_TABS.includes(paramTab) ? paramTab : 'active')
  // ── 進行中 ─────────────────────────────────────────────────
  const activeRSale     = rSale.filter(o => SALE_ACTIVE.includes(o.status))
  const activeSSale     = sSale.filter(o => SALE_ACTIVE.includes(o.status))
  const activeRPurchase = rPurchase.filter(o => PURCHASE_ACTIVE.includes(o.status))
  const activeSPurchase = sPurchase.filter(o => PURCHASE_ACTIVE.includes(o.status))
  const activeCount = activeRSale.length + activeSSale.length + activeRPurchase.length + activeSPurchase.length

  // ── 合意済案件（送受信をマージ・重複排除） ──────────────────
  const agreedMap = new Map<string, PurchaseOffer & { role: 'buyer' | 'seller' }>()
  sPurchase.filter(o => o.status === 'agreed').forEach(o => agreedMap.set(o.id, { ...o, role: 'buyer' }))
  rPurchase.filter(o => o.status === 'agreed').forEach(o => agreedMap.set(o.id, { ...o, role: 'seller' }))
  const agreedDeals = Array.from(agreedMap.values()).sort(
    (a, b) => (b.agreed_at ?? '').localeCompare(a.agreed_at ?? '')
  )

  // ── 履歴 ───────────────────────────────────────────────────
  const histRSale     = rSale.filter(o => TERMINAL.includes(o.status))
  const histSSale     = sSale.filter(o => TERMINAL.includes(o.status))
  const histRPurchase = rPurchase.filter(o => TERMINAL.includes(o.status))
  const histSPurchase = sPurchase.filter(o => TERMINAL.includes(o.status))
  const historyCount  = histRSale.length + histSSale.length + histRPurchase.length + histSPurchase.length

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="active" className="gap-1.5">
          進行中
          {activeCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {activeCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="agreed" className="gap-1.5">
          合意済案件
          {agreedDeals.length > 0 && (
            <span className="bg-emerald-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {agreedDeals.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-1.5">
          履歴
          {historyCount > 0 && (
            <span className="bg-gray-400 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {historyCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ══ 進行中タブ ══════════════════════════════════════════ */}
      <TabsContent value="active" className="space-y-8">
        {activeCount === 0 && (
          <EmptyState text="進行中のオファーはありません" />
        )}

        {/* 受信した売却オファー（買主として） */}
        {activeRSale.length > 0 && (
          <section>
            <SectionHeading
              title="受信した売却オファー"
              badge={activeRSale.filter(o => o.status === 'pending').length}
              badgeLabel="未返答"
            />
            <div className="space-y-3">
              {activeRSale.map(offer => (
                <div key={offer.id} className="border rounded-lg p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{offer.properties?.name}</p>
                      <p className="text-sm text-gray-500 truncate">{offer.properties?.address}</p>
                      <p className="text-sm text-gray-500">送信元: {offer.sender?.company_name}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <p className="font-semibold text-gray-900">{formatPropertyPrice(offer.properties?.price ?? null)}</p>
                      <StatusBadge status={offer.status} labels={SALE_OFFER_STATUS_LABELS} />
                    </div>
                  </div>
                  {offer.message && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{offer.message}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>有効期限: {new Date(offer.expires_at).toLocaleDateString('ja-JP')}</span>
                    <div className="flex gap-2">
                      {offer.status === 'considering' && offer.properties && (
                        <Link
                          href={`/offers/purchase/new?saleOfferId=${offer.id}&propertyId=${offer.property_id}`}
                          className="text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700 transition-colors"
                        >
                          購入オファーを送る
                        </Link>
                      )}
                      {offer.status === 'considering' && offer.properties && (
                        <Link
                          href={`/properties/${offer.property_id}`}
                          className="text-xs border border-gray-300 text-gray-600 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors"
                        >
                          物件詳細を見る
                        </Link>
                      )}
                      <SaleOfferActions offerId={offer.id} currentStatus={offer.status as 'pending' | 'considering'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 送信した売却オファー（売主として） */}
        {activeSSale.length > 0 && (
          <section>
            <SectionHeading title="送信した売却オファー" />
            <div className="space-y-3">
              {activeSSale.map(offer => (
                <div key={offer.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{offer.properties?.name}</p>
                      <p className="text-sm text-gray-500">送信先: {offer.recipient?.company_name}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <p className="font-semibold">{formatPropertyPrice(offer.properties?.price ?? null)}</p>
                      <StatusBadge status={offer.status} labels={SALE_OFFER_STATUS_LABELS} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    送信日: {new Date(offer.created_at).toLocaleDateString('ja-JP')} /
                    有効期限: {new Date(offer.expires_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 受信した購入オファー（売主として） */}
        {activeRPurchase.length > 0 && (
          <section>
            <SectionHeading
              title="受信した購入オファー"
              badge={activeRPurchase.filter(o => o.status === 'pending').length}
              badgeLabel="未返答"
            />
            <div className="space-y-3">
              {activeRPurchase.map(offer => (
                <div key={offer.id} className="border rounded-lg p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{offer.properties?.name}</p>
                      <p className="text-sm text-gray-500">買主: {offer.buyer?.company_name}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <p className="font-semibold text-blue-700">希望価格: {formatPropertyPrice(offer.offer_price)}</p>
                      <StatusBadge status={offer.status} labels={PURCHASE_OFFER_STATUS_LABELS} />
                    </div>
                  </div>
                  {offer.conditions && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                      <span className="font-medium">条件:</span> {offer.conditions}
                    </p>
                  )}
                  {offer.message && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{offer.message}</p>
                  )}
                  {offer.status === 'pending' && (
                    <div className="flex justify-end">
                      <PurchaseOfferActions offerId={offer.id} />
                    </div>
                  )}
                  {offer.status === 'accepted' && (
                    <p className="text-sm text-emerald-700 font-medium">承諾済み — 買主の合意確定を待っています</p>
                  )}
                  {offer.status === 'counter_offered' && (
                    <p className="text-sm text-amber-700 font-medium">条件変更を提案中 — 買主の返答を待っています</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 送信した購入オファー（買主として） */}
        {activeSPurchase.length > 0 && (
          <section>
            <SectionHeading title="送信した購入オファー" />
            <div className="space-y-3">
              {activeSPurchase.map(offer => (
                <div key={offer.id} className="border rounded-lg p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{offer.properties?.name}</p>
                      <p className="text-sm text-gray-500">売主: {offer.seller?.company_name}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <p className="font-semibold text-blue-700">希望価格: {formatPropertyPrice(offer.offer_price)}</p>
                      <StatusBadge status={offer.status} labels={PURCHASE_OFFER_STATUS_LABELS} />
                    </div>
                  </div>
                  {offer.status === 'counter_offered' && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm space-y-2">
                      <p className="font-medium text-amber-800">条件変更の提案があります</p>
                      {offer.counter_price && <p>提案価格: {formatPropertyPrice(offer.counter_price)}</p>}
                      {offer.counter_conditions && <p>条件: {offer.counter_conditions}</p>}
                      <CounterOfferActions offerId={offer.id} />
                    </div>
                  )}
                  {offer.status === 'accepted' && (
                    <div className="flex justify-end">
                      <AgreeButton offerId={offer.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </TabsContent>

      {/* ══ 合意済案件タブ ══════════════════════════════════════ */}
      <TabsContent value="agreed">
        {agreedDeals.length === 0 ? (
          <EmptyState text="合意済みの取引はありません" />
        ) : (
          <div className="space-y-4">
            {agreedDeals.map(deal => (
              <div
                key={deal.id}
                className="border-2 border-emerald-200 rounded-xl p-5 bg-emerald-50 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-emerald-600 text-white rounded-full px-2 py-0.5">
                        合意済
                      </span>
                      <span className="text-xs text-gray-500">
                        {deal.role === 'buyer' ? '買主として' : '売主として'}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{deal.properties?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{deal.properties?.address}</p>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <p className="text-lg font-bold text-emerald-700">{formatPropertyPrice(deal.offer_price)}</p>
                    <p className="text-xs text-gray-500">合意価格</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-600 border-t border-emerald-200 pt-3">
                  <div>
                    <span className="text-xs text-gray-400">
                      {deal.role === 'buyer' ? '売主' : '買主'}
                    </span>
                    <p className="font-medium">
                      {deal.role === 'buyer' ? deal.seller?.company_name : deal.buyer?.company_name}
                    </p>
                  </div>
                  {deal.agreed_at && (
                    <div>
                      <span className="text-xs text-gray-400">合意日</span>
                      <p className="font-medium">{new Date(deal.agreed_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  )}
                </div>
                {(deal.conditions || deal.counter_conditions) && (
                  <p className="text-sm text-gray-600 bg-white rounded p-2 border border-emerald-100">
                    <span className="font-medium">合意条件:</span>{' '}
                    {deal.counter_conditions ?? deal.conditions}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ══ 履歴タブ ════════════════════════════════════════════ */}
      <TabsContent value="history" className="space-y-8">
        {historyCount === 0 && (
          <EmptyState text="過去のオファー履歴はありません" />
        )}

        {histRSale.length > 0 && (
          <section>
            <SectionHeading title="受信した売却オファー（終了）" />
            <HistorySaleList offers={histRSale} role="recipient" />
          </section>
        )}
        {histSSale.length > 0 && (
          <section>
            <SectionHeading title="送信した売却オファー（終了）" />
            <HistorySaleList offers={histSSale} role="sender" />
          </section>
        )}
        {histRPurchase.length > 0 && (
          <section>
            <SectionHeading title="受信した購入オファー（終了）" />
            <HistoryPurchaseList offers={histRPurchase} role="seller" />
          </section>
        )}
        {histSPurchase.length > 0 && (
          <section>
            <SectionHeading title="送信した購入オファー（終了）" />
            <HistoryPurchaseList offers={histSPurchase} role="buyer" />
          </section>
        )}
      </TabsContent>
    </Tabs>
  )
}

// ── 共通パーツ ────────────────────────────────────────────────

function SectionHeading({ title, badge, badgeLabel }: { title: string; badge?: number; badgeLabel?: string }) {
  return (
    <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
      {title}
      {badge != null && badge > 0 && (
        <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
          {badge}件 {badgeLabel}
        </span>
      )}
    </h2>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed rounded-lg py-12 text-center text-sm text-gray-400">
      {text}
    </div>
  )
}

function StatusBadge<T extends string>({ status, labels }: { status: T; labels: Record<T, string> }) {
  const colorMap: Record<string, string> = {
    pending:         'bg-yellow-100 text-yellow-800',
    considering:     'bg-blue-100 text-blue-800',
    accepted:        'bg-green-100 text-green-800',
    counter_offered: 'bg-amber-100 text-amber-800',
    declined:        'bg-red-100 text-red-800',
    expired:         'bg-gray-100 text-gray-500',
    agreed:          'bg-emerald-100 text-emerald-800',
  }
  return (
    <span className={`inline-block text-xs rounded-full px-2 py-0.5 font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status]}
    </span>
  )
}

function HistorySaleList({ offers, role }: { offers: SaleOffer[]; role: 'recipient' | 'sender' }) {
  return (
    <div className="space-y-2">
      {offers.map(offer => (
        <div key={offer.id} className="border rounded-lg p-3 bg-gray-50 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{offer.properties?.name}</p>
            <p className="text-xs text-gray-400">
              {role === 'recipient' ? `送信元: ${offer.sender?.company_name}` : `送信先: ${offer.recipient?.company_name}`}
              {' / '}
              {new Date(offer.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <StatusBadge status={offer.status} labels={SALE_OFFER_STATUS_LABELS} />
        </div>
      ))}
    </div>
  )
}

function HistoryPurchaseList({ offers, role }: { offers: PurchaseOffer[]; role: 'buyer' | 'seller' }) {
  return (
    <div className="space-y-2">
      {offers.map(offer => (
        <div key={offer.id} className="border rounded-lg p-3 bg-gray-50 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{offer.properties?.name}</p>
            <p className="text-xs text-gray-400">
              {role === 'buyer' ? `売主: ${offer.seller?.company_name}` : `買主: ${offer.buyer?.company_name}`}
              {' / '}
              希望価格: {formatPropertyPrice(offer.offer_price)}
              {' / '}
              {new Date(offer.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <StatusBadge status={offer.status} labels={PURCHASE_OFFER_STATUS_LABELS} />
        </div>
      ))}
    </div>
  )
}
