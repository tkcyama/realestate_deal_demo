'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { respondPurchaseOffer } from './actions'

export default function PurchaseOfferActions({ offerId }: { offerId: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'default' | 'counter'>('default')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [counterPriceOku, setCounterPriceOku] = useState('')
  const [counterConditions, setCounterConditions] = useState('')

  async function handle(action: 'accepted' | 'declined' | 'counter_offered') {
    setLoading(action)
    setError(null)

    let counterData: { price?: number; conditions?: string } | undefined
    if (action === 'counter_offered') {
      counterData = {}
      if (counterPriceOku) counterData.price = Math.round(parseFloat(counterPriceOku) * 100_000_000)
      if (counterConditions) counterData.conditions = counterConditions
      if (!counterData.price && !counterData.conditions) {
        setError('条件変更の価格または条件を入力してください')
        setLoading(null)
        return
      }
    }

    const result = await respondPurchaseOffer(offerId, action, counterData)
    setLoading(null)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  if (mode === 'counter') {
    return (
      <div className="space-y-3 w-full">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="提案価格（億円）"
            value={counterPriceOku}
            onChange={(e) => setCounterPriceOku(e.target.value)}
            className="max-w-40"
          />
          <span className="text-sm text-gray-500">億円</span>
        </div>
        <Textarea
          placeholder="変更条件（任意）"
          value={counterConditions}
          onChange={(e) => setCounterConditions(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handle('counter_offered')}
            disabled={loading !== null}
          >
            {loading === 'counter_offered' ? '送信中...' : '条件変更を送信'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setMode('default'); setError(null) }}
          >
            キャンセル
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <Button
        size="sm"
        onClick={() => handle('accepted')}
        disabled={loading !== null}
      >
        {loading === 'accepted' ? '処理中...' : '承諾'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setMode('counter')}
        disabled={loading !== null}
      >
        条件変更
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-300 hover:bg-red-50"
        onClick={() => handle('declined')}
        disabled={loading !== null}
      >
        {loading === 'declined' ? '処理中...' : '拒否'}
      </Button>
    </div>
  )
}
