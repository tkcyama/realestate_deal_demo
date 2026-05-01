'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function PropertyApprovalActions({ propertyId }: { propertyId: string }) {
  const router = useRouter()

  async function updateStatus(status: string) {
    const supabase = createClient()
    await supabase
      .from('properties')
      .update({ status })
      .eq('id', propertyId)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        className="bg-[#1F6B3A] hover:bg-[#175530] text-white text-xs h-7"
        onClick={() => updateStatus('published')}
      >
        承認・公開
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
        onClick={() => updateStatus('draft')}
      >
        差し戻し
      </Button>
    </div>
  )
}
