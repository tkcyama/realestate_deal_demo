'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type Props = {
  memberId: string
  currentStatus: string
}

export function MemberActions({ memberId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function updateStatus(status: string) {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ status })
      .eq('id', memberId)
    setLoading(false)
    router.refresh()
  }

  if (currentStatus === 'pending') {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-[#1F6B3A] hover:bg-[#175530] text-white text-xs h-7"
          onClick={() => updateStatus('approved')}
          disabled={loading}
        >
          承認
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
          onClick={() => updateStatus('suspended')}
          disabled={loading}
        >
          却下
        </Button>
      </div>
    )
  }

  if (currentStatus === 'approved') {
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
        onClick={() => updateStatus('suspended')}
        disabled={loading}
      >
        停止
      </Button>
    )
  }

  if (currentStatus === 'suspended') {
    return (
      <Button
        size="sm"
        className="bg-[#1F6B3A] hover:bg-[#175530] text-white text-xs h-7"
        onClick={() => updateStatus('approved')}
        disabled={loading}
      >
        再有効化
      </Button>
    )
  }

  return null
}
