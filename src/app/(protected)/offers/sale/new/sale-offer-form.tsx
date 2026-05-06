'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { sendSaleOffer } from '../../actions'

type Property = {
  id: string
  name: string
  address: string
  use_type: string
  price: number
}

type Member = {
  id: string
  company_name: string
  full_name: string
  roles: string[]
}

type Props = {
  property: Property
  members: Member[]
}

function getRoleDisplayCategories(roles: string[]): string[] {
  const cats: string[] = []
  if (roles.some(r => r === 'seller' || r === 'buyer')) cats.push('取引当事者')
  if (roles.includes('lender')) cats.push('レンダー')
  return cats
}

export default function SaleOfferForm({ property, members }: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ sent: number; skipped: number } | null>(null)

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(members.map((m) => m.id)))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.size === 0) { setError('送信先を1件以上選択してください'); return }

    setSubmitting(true)
    setError(null)
    setResult(null)

    const res = await sendSaleOffer({
      propertyId: property.id,
      recipientIds: Array.from(selectedIds),
      message,
    })

    setSubmitting(false)

    if (res.error) {
      setError(res.error)
    } else if (res.success) {
      setResult({ sent: res.sent, skipped: res.skipped })
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-800">
          <p className="font-semibold mb-1">送信完了</p>
          <p>{result.sent} 件のオファーを送信しました。</p>
          {result.skipped > 0 && (
            <p className="mt-1 text-green-700">
              ※ すでに送信済みだった {result.skipped} 件はスキップされました。
            </p>
          )}
        </div>
        <Button onClick={() => router.push('/offers')}>オファー一覧へ戻る</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 送信先選択 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            送信先会員 <span className="text-red-500">*</span>
            {selectedIds.size > 0 && (
              <span className="ml-2 text-xs font-normal text-blue-600">
                {selectedIds.size} 件選択中
              </span>
            )}
          </Label>
          {members.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              {selectedIds.size === members.length ? 'すべて解除' : 'すべて選択'}
            </button>
          )}
        </div>
        <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
          {members.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">送信可能な会員がいません</p>
          )}
          {members.map((m) => (
            <label
              key={m.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedIds.has(m.id) ? 'bg-blue-50' : ''}`}
            >
              <input
                type="checkbox"
                value={m.id}
                checked={selectedIds.has(m.id)}
                onChange={() => toggleMember(m.id)}
                className="shrink-0 h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-sm text-gray-900">{m.company_name}</span>
                <span className="block text-xs text-gray-500">{m.full_name}</span>
              </span>
              <span className="flex gap-1 shrink-0">
                {getRoleDisplayCategories(m.roles).map((label) => (
                  <span key={label} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                    {label}
                  </span>
                ))}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* メッセージ */}
      <div className="space-y-2">
        <Label htmlFor="message">メッセージ（任意）</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="物件に関する補足情報や挨拶文をご記入ください"
          rows={5}
        />
      </div>

      <p className="text-xs text-gray-500">
        ※ オファーの有効期限は送信から14日間です。すでにオファー済みの会員は自動的にスキップされます。
      </p>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting || selectedIds.size === 0}>
          {submitting ? '送信中...' : `オファーを送信（${selectedIds.size} 件）`}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}
