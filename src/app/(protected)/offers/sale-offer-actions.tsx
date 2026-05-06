'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { respondSaleOffer } from './actions'

export default function SaleOfferActions({
  offerId,
  currentStatus,
}: {
  offerId: string
  currentStatus: 'pending' | 'considering'
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<'considering' | 'declined' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handle(status: 'considering' | 'declined') {
    setLoading(status)
    setError(null)
    const result = await respondSaleOffer(offerId, status)
    setLoading(null)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {currentStatus === 'pending' && (
        <Button
          size="sm"
          onClick={() => handle('considering')}
          disabled={loading !== null}
        >
          {loading === 'considering' ? '処理中...' : '検討する'}
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => handle('declined')}
        disabled={loading !== null}
      >
        {loading === 'declined' ? '処理中...' : '見送り'}
      </Button>
    </div>
  )
}
