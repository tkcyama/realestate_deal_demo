export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return null

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=ja&region=JP&key=${key}`
  const res = await fetch(url)
  const data = await res.json()

  if (data.status !== 'OK' || !data.results[0]) return null
  return data.results[0].geometry.location
}
