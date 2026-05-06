import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PropertyMap } from '@/components/map/property-map'
import type { Property } from '@/types'

export const dynamic = 'force-dynamic'

type MapProperty = Property & { pin_type: 'own' | 'published' | 'transaction' }

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 自分の保有物件（全ステータス・lat/lngあり）
  const { data: ownProperties } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', user.id)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  // 他会員の公開中物件（lat/lngあり）
  const { data: publishedProperties } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'published')
    .neq('seller_id', user.id)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  const ownIds = new Set((ownProperties ?? []).map((p) => p.id))

  const mapProperties: MapProperty[] = [
    ...(ownProperties ?? []).map((p) => ({ ...p, pin_type: 'own' as const })),
    ...(publishedProperties ?? [])
      .filter((p) => !ownIds.has(p.id))
      .map((p) => ({ ...p, pin_type: 'published' as const })),
  ]

  return (
    <div className="p-6 h-[calc(100vh-49px)] flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">地図表示</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            保有物件・公開中物件の位置を確認できます
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#1F3864] inline-block" />
            保有物件（{(ownProperties ?? []).length}件）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#C00000] inline-block" />
            売却物件（{(publishedProperties ?? []).length}件）
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PropertyMap properties={mapProperties} currentUserId={user.id} />
      </div>
    </div>
  )
}
