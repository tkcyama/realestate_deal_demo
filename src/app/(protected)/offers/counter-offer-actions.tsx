'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { respondCounterOffer } from './actions'

export default function CounterOfferActions({ offerId }: { offerId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accepted' | 'declined' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handle(action: 'accepted' | 'declined') {
    setLoading(action)
    setError(null)
    const result = await respondCounterOffer(offerId, action)
    setLoading(null)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <Button
        size="sm"
        onClick={() => handle('accepted')}
        disabled={loading !== null}
      >
        {loading === 'accepted' ? '処理中...' : '条件を承諾する'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handle('declined')}
        disabled={loading !== null}
      >
        {loading === 'declined' ? '処理中...' : '見送る'}
      </Button>
    </div>
  )
}
