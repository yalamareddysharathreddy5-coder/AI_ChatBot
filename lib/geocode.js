const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'
const GEOCODE_TIMEOUT_MS = 7000
const USER_AGENT =
  'SunChatBot/1.0 (https://github.com/yalamareddysharathreddy5-coder/AI_ChatBot)'

function firstString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)
}

function buildLabel(data) {
  const address = data?.address || {}
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.suburb ||
    address.county ||
    address.state_district ||
    null
  const region = address.state || address.state_district || address.region || null
  const country = address.country || null
  const label = [city, region, country].filter(Boolean).join(', ')
  return label || data?.display_name || null
}

/**
 * Reverse-geocodes coordinates into a readable place name using the free
 * Nominatim (OpenStreetMap) reverse geocoder. Returns null when it cannot find
 * a resolvable address. Server-side only — Nominatim's usage policy requires a
 * descriptive User-Agent.
 */
export async function reverseGeocode(latitude, longitude) {
  const url = new URL(NOMINATIM_REVERSE_URL)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('zoom', '10')
  url.searchParams.set('addressdetails', '1')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS)
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    })
    if (!response.ok) throw new Error(`geocoding service returned ${response.status}`)
    const data = await response.json()
    const label = buildLabel(data)
    if (!label) throw new Error('geocoding service returned no address')
    return {
      name: firstString(
        data?.address?.city,
        data?.address?.town,
        data?.address?.village,
        data?.address?.municipality,
        data?.address?.suburb,
        data?.address?.county,
        data?.address?.state_district,
      ),
      region: firstString(
        data?.address?.state,
        data?.address?.state_district,
        data?.address?.region,
      ),
      country: firstString(data?.address?.country),
      label,
    }
  } finally {
    clearTimeout(timer)
  }
}