'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { agreeOffer } from './actions'

export default function AgreeButton({ offerId }: { offerId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle() {
    setLoading(true)
    setError(null)
    const result = await agreeOffer(offerId)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/offers?tab=agreed')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700"
        onClick={handle}
        disabled={loading}
      >
        {loading ? '処理中...' : '取引合意を確定する'}
      </Button>
    </div>
  )
}
