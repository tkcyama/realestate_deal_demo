export function formatPrice(value: number | null): string {
  if (value == null) return '—'
  if (value >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(1)}億円`
  }
  if (value >= 1_0000) {
    return `${(value / 1_0000).toFixed(0)}万円`
  }
  return `${value.toLocaleString()}円`
}

export function formatYield(value: number | null): string {
  if (value == null) return '—'
  return `${(value * 100).toFixed(2)}%`
}

export function formatArea(sqm: number | null, tsubo: number | null): string {
  if (sqm == null && tsubo == null) return '—'
  const parts: string[] = []
  if (tsubo != null) parts.push(`${tsubo.toFixed(1)}坪`)
  if (sqm != null) parts.push(`${sqm.toFixed(1)}㎡`)
  return parts.join(' / ')
}

export function formatNumber(value: number | null, unit = ''): string {
  if (value == null) return '—'
  return `${value.toLocaleString()}${unit}`
}
