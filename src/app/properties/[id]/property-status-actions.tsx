'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PropertyStatus } from '@/types'

type Props = {
  propertyId: string
  currentStatus: PropertyStatus
}

export function PropertyStatusActions({ propertyId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function updateStatus(status: PropertyStatus) {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: updated, error } = await supabase
      .from('properties')
      .update({ status })
      .eq('id', propertyId)
      .select('id')

    setLoading(false)

    if (error) {
      setError(`更新失敗: ${error.message}`)
      return
    }
    if (!updated || updated.length === 0) {
      setError('更新できませんでした。権限を確認してください。')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <Alert variant="destructive" className="py-2 px-3 text-xs max-w-xs">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {currentStatus === 'draft' && (
        <Button
          size="sm"
          className="bg-[#1F3864] hover:bg-[#162a4e]"
          onClick={() => updateStatus('pending_approval')}
          disabled={loading}
        >
          {loading ? '申請中...' : '公開申請'}
        </Button>
      )}

      {currentStatus === 'pending_approval' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus('draft')}
          disabled={loading}
        >
          {loading ? '処理中...' : '申請を取り消す'}
        </Button>
      )}

      {currentStatus === 'published' && (
        <Button
          size="sm"
          variant="outline"
          className="border-amber-400 text-amber-700 hover:bg-amber-50"
          onClick={() => updateStatus('draft')}
          disabled={loading}
        >
          {loading ? '処理中...' : '非公開に戻す'}
        </Button>
      )}
    </div>
  )
}
