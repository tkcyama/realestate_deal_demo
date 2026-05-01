'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps'
import type { Property } from '@/types'
import { formatPrice, formatYield } from '@/lib/format'
import { USE_TYPE_LABELS } from '@/types'
import Link from 'next/link'

// ピン色定義
const PIN_COLORS = {
  own:         { bg: '#1F3864', border: '#162a4e', glyph: '#ffffff' }, // 保有（紺）
  published:   { bg: '#C00000', border: '#900000', glyph: '#ffffff' }, // 売却（赤）
  transaction: { bg: '#1F6B3A', border: '#155230', glyph: '#ffffff' }, // 取引事例（緑）
}

type PinType = keyof typeof PIN_COLORS

type MapProperty = Property & { pin_type: PinType }

type Props = {
  properties: MapProperty[]
  currentUserId?: string
}

export function PropertyMap({ properties, currentUserId }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
  const [selected, setSelected] = useState<MapProperty | null>(null)

  const mappable = properties.filter((p) => p.lat != null && p.lng != null)

  const center =
    mappable.length > 0
      ? { lat: mappable[0].lat!, lng: mappable[0].lng! }
      : { lat: 35.6812, lng: 139.7671 } // 東京駅デフォルト

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative w-full h-full rounded-xl overflow-hidden border">
        <Map
          defaultCenter={center}
          defaultZoom={12}
          mapId="propconnect-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {mappable.map((prop) => {
            const colors = PIN_COLORS[prop.pin_type]
            return (
              <AdvancedMarker
                key={prop.id}
                position={{ lat: prop.lat!, lng: prop.lng! }}
                onClick={() => setSelected(prop)}
              >
                <Pin
                  background={colors.bg}
                  borderColor={colors.border}
                  glyphColor={colors.glyph}
                />
              </AdvancedMarker>
            )
          })}

          {selected && (
            <InfoWindow
              position={{ lat: selected.lat!, lng: selected.lng! }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="p-1 min-w-[200px]">
                <p className="font-semibold text-gray-900 text-sm mb-1">{selected.name}</p>
                <p className="text-xs text-gray-500 mb-2">{selected.address}</p>
                <div className="flex gap-3 text-xs text-gray-700 mb-3">
                  <span>{USE_TYPE_LABELS[selected.use_type]}</span>
                  <span className="font-medium">{formatPrice(selected.price)}</span>
                  {selected.noi_yield != null && (
                    <span>NOI {formatYield(selected.noi_yield)}</span>
                  )}
                </div>
                <Link
                  href={`/properties/${selected.id}`}
                  className="text-xs text-[#1F3864] hover:underline font-medium"
                >
                  詳細を見る →
                </Link>
              </div>
            </InfoWindow>
          )}
        </Map>

        {/* 凡例 */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md border px-3 py-2 text-xs space-y-1.5">
          <Legend color="#1F3864" label="保有物件" />
          <Legend color="#C00000" label="売却物件" />
          <Legend color="#1F6B3A" label="取引事例" />
        </div>
      </div>
    </APIProvider>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-3 h-3 rounded-full inline-block shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-600">{label}</span>
    </div>
  )
}
