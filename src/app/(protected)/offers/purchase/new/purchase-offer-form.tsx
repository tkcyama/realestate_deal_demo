'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { formatPropertyPrice } from '@/lib/format'
import { sendPurchaseOffer } from '../../actions'

type Property = {
  id: string
  name: string
  address: string
  use_type: string
  price: number
  seller_id: string
  noi_yield: number | null
  ncf_yield: number | null
}

type Props = {
  property: Property
  saleOfferId: string | null
}

export default function PurchaseOfferForm({ property, saleOfferId }: Props) {
  const router = useRouter()
  const [offerPriceOku, setOfferPriceOku] = useState('')
  const [conditions, setConditions] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(offerPriceOku)
    if (isNaN(price) || price <= 0) {
      setError('希望価格を正しく入力してください')
      return
    }

    setSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('property_id', property.id)
    formData.append('seller_id', property.seller_id)
    formData.append('offer_price_oku', offerPriceOku)
    if (saleOfferId) formData.append('sale_offer_id', saleOfferId)
    formData.append('conditions', conditions)
    formData.append('message', message)

    const result = await sendPurchaseOffer(formData)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push('/offers')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 物件情報サマリー */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">売却希望価格</span>
          <span className="font-semibold">{formatPropertyPrice(property.price)}</span>
        </div>
        {property.noi_yield && (
          <div className="flex justify-between">
            <span className="text-gray-500">NOI利回り</span>
            <span>{(property.noi_yield * 100).toFixed(2)}%</span>
          </div>
        )}
      </div>

      {/* 希望価格 */}
      <div className="space-y-2">
        <Label htmlFor="offer_price">希望購入価格（億円） <span className="text-red-500">*</span></Label>
        <div className="flex items-center gap-2">
          <Input
            id="offer_price"
            type="number"
            min="0.01"
            step="0.01"
            value={offerPriceOku}
            onChange={(e) => setOfferPriceOku(e.target.value)}
            placeholder="例: 48.5"
            className="max-w-40"
            required
          />
          <span className="text-sm text-gray-500">億円</span>
        </div>
        {offerPriceOku && !isNaN(parseFloat(offerPriceOku)) && (
          <p className="text-xs text-gray-500">
            = {formatPropertyPrice(Math.round(parseFloat(offerPriceOku) * 100_000_000))}
          </p>
        )}
      </div>

      {/* 購入条件 */}
      <div className="space-y-2">
        <Label htmlFor="conditions">購入条件（任意）</Label>
        <Textarea
          id="conditions"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          placeholder="例: 現状渡し希望 / 決済期限: 3ヶ月以内 など"
          rows={3}
        />
      </div>

      {/* メッセージ */}
      <div className="space-y-2">
        <Label htmlFor="message">メッセージ（任意）</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="売主へのメッセージをご記入ください"
          rows={4}
        />
      </div>

      <p className="text-xs text-gray-500">
        ※ オファーの有効期限は送信から14日間です。
      </p>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting || !offerPriceOku}>
          {submitting ? '送信中...' : '購入オファーを送信'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}
