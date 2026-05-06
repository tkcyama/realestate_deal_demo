'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Input } from '@/components/ui/input'
import { USE_TYPE_LABELS, type PropertyUse } from '@/types'

export function PropertyFilters({
  q, use_type, prefecture, price_min, price_max,
}: {
  q?: string
  use_type?: string
  prefecture?: string
  price_min?: string
  price_max?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [qValue, setQValue] = useState(q ?? '')
  const [prefValue, setPrefValue] = useState(prefecture ?? '')
  const [pMinValue, setPMinValue] = useState(price_min ?? '')
  const [pMaxValue, setPMaxValue] = useState(price_max ?? '')

  const commit = useCallback((overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams(searchParams.toString())
    const values: Record<string, string> = {
      q: qValue,
      prefecture: prefValue,
      price_min: pMinValue,
      price_max: pMaxValue,
      use_type: use_type ?? '',
      ...overrides,
    }
    Object.entries(values).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams, qValue, prefValue, pMinValue, pMaxValue, use_type])

  const hasFilter = q || use_type || prefecture || price_min || price_max

  return (
    <div className="bg-white rounded-xl border p-4 mb-6">
      <div className="flex flex-wrap gap-3 items-end">
        {/* キーワード */}
        <div className="flex-1 min-w-44">
          <label className="text-xs text-gray-500 block mb-1">キーワード</label>
          <Input
            placeholder="物件名・住所"
            value={qValue}
            onChange={(e) => setQValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit({ q: qValue }) }}
            onBlur={() => commit({ q: qValue })}
          />
        </div>

        {/* 用途 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">用途</label>
          <select
            className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864] h-10"
            value={use_type ?? ''}
            onChange={(e) => commit({ use_type: e.target.value })}
          >
            <option value="">すべて</option>
            {(Object.entries(USE_TYPE_LABELS) as [PropertyUse, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* 都道府県 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">都道府県</label>
          <Input
            placeholder="東京都"
            className="w-28"
            value={prefValue}
            onChange={(e) => setPrefValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit({ prefecture: prefValue }) }}
            onBlur={() => commit({ prefecture: prefValue })}
          />
        </div>

        {/* 価格帯 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">価格（億円）</label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder="下限"
              className="w-20"
              value={pMinValue}
              onChange={(e) => setPMinValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit({ price_min: pMinValue }) }}
              onBlur={() => commit({ price_min: pMinValue })}
            />
            <span className="text-gray-400 text-sm">〜</span>
            <Input
              type="number"
              placeholder="上限"
              className="w-20"
              value={pMaxValue}
              onChange={(e) => setPMaxValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit({ price_max: pMaxValue }) }}
              onBlur={() => commit({ price_max: pMaxValue })}
            />
          </div>
        </div>

        {hasFilter && (
          <button
            onClick={() => router.push(pathname)}
            className="text-sm text-gray-400 hover:text-gray-600 underline pb-2"
          >
            クリア
          </button>
        )}
      </div>
    </div>
  )
}
