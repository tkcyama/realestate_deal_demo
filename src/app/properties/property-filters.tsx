'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
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
  const qRef = useRef<HTMLInputElement>(null)
  const prefRef = useRef<HTMLInputElement>(null)
  const pMinRef = useRef<HTMLInputElement>(null)
  const pMaxRef = useRef<HTMLInputElement>(null)

  const buildUrl = useCallback((overrides: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    const merged = {
      q: qRef.current?.value ?? '',
      prefecture: prefRef.current?.value ?? '',
      price_min: pMinRef.current?.value ?? '',
      price_max: pMaxRef.current?.value ?? '',
      ...overrides,
    }
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    return `${pathname}?${params.toString()}`
  }, [pathname, searchParams])

  const commit = useCallback((overrides: Record<string, string> = {}) => {
    router.push(buildUrl(overrides))
  }, [router, buildUrl])

  const hasFilter = q || use_type || prefecture || price_min || price_max

  return (
    <div className="bg-white rounded-xl border p-4 mb-6">
      <div className="flex flex-wrap gap-3 items-end">
        {/* キーワード */}
        <div className="flex-1 min-w-44">
          <label className="text-xs text-gray-500 block mb-1">キーワード</label>
          <Input
            ref={qRef}
            placeholder="物件名・住所"
            defaultValue={q ?? ''}
            onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
            onBlur={() => commit()}
          />
        </div>

        {/* 用途 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">用途</label>
          <select
            className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864] h-10"
            defaultValue={use_type ?? ''}
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
            ref={prefRef}
            placeholder="東京都"
            className="w-28"
            defaultValue={prefecture ?? ''}
            onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
            onBlur={() => commit()}
          />
        </div>

        {/* 価格帯 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">価格（億円）</label>
          <div className="flex items-center gap-1">
            <Input
              ref={pMinRef}
              type="number"
              placeholder="下限"
              className="w-20"
              defaultValue={price_min ?? ''}
              onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
              onBlur={() => commit()}
            />
            <span className="text-gray-400 text-sm">〜</span>
            <Input
              ref={pMaxRef}
              type="number"
              placeholder="上限"
              className="w-20"
              defaultValue={price_max ?? ''}
              onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
              onBlur={() => commit()}
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
