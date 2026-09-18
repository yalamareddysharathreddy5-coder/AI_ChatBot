import { reverseGeocode } from '../lib/geocode.js'
import { buildImageUrl, isImageQuery } from '../lib/image.js'

const DEFAULT_MODEL = 'openai/gpt-oss-20b'
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
const OPENWEATHERMAP_URL = 'https://api.openweathermap.org/data/2.5/weather'
const WEATHER_FETCH_TIMEOUT_MS = 7000

const WMO_WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

function send(res, status, body) {
  res.status(status).json(body)
}

function round(value, decimals = 1) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Number(value.toFixed(decimals))
    : null
}

function safeTimeZone(value) {
  if (typeof value !== 'string' || !value) return undefined
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return value
  } catch {
    return undefined
  }
}

/**
 * Formats an ISO timestamp into a human-friendly string like:
 * "Thursday, 18 September 2026, 11:45 PM IST"
 */
export function formatDateTime(dateValue, timeZoneValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null

  const tz = safeTimeZone(timeZoneValue) || 'UTC'
  const dateParts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz,
  }).formatToParts(date)
  const timeParts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
    timeZone: tz,
  }).formatToParts(date)

  const part = (parts, type) => (parts.find((p) => p.type === type) || {}).value

  return `${part(dateParts, 'weekday')}, ${part(dateParts, 'day')} ${part(dateParts, 'month')} ${part(dateParts, 'year')}, ${part(timeParts, 'hour')}:${part(timeParts, 'minute')} ${part(timeParts, 'dayPeriod')} ${part(timeParts, 'timeZoneName')}`
}

async function fetchJSONWithTimeout(url, timeoutMs = WEATHER_FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`weather service returned ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetches the current weather for a location.
 * Uses Open-Meteo by default (no API key). If the WEATHER_API_KEY env var is
 * set, it uses OpenWeatherMap instead. Throws on any failure so the caller can
 * degrade gracefully.
 */
export async function fetchWeather(latitude, longitude) {
  const apiKey = process.env.WEATHER_API_KEY

  if (apiKey) {
    const url = `${OPENWEATHERMAP_URL}?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
    const data = await fetchJSONWithTimeout(url)
    const main = data?.main || {}
    return {
      location: data?.name || `latitude ${latitude}, longitude ${longitude}`,
      condition: data?.weather?.[0]?.description || null,
      temperature: round(main.temp),
      feelsLike: round(main.feels_like),
      humidity: typeof main.humidity === 'number' ? main.humidity : null,
      windSpeed: round(data?.wind?.speed),
      windSpeedUnit: 'km/h',
    }
  }

  const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`
  const data = await fetchJSONWithTimeout(url)
  const current = data?.current
  if (!current) throw new Error('weather service returned no current data')

  return {
    location: `latitude ${latitude.toFixed(2)}, longitude ${longitude.toFixed(2)}`,
    condition: WMO_WEATHER_CODES[current.weather_code] || 'Unknown conditions',
    temperature: round(current.temperature_2m),
    feelsLike: round(current.apparent_temperature),
    humidity:
      typeof current.relative_humidity_2m === 'number'
        ? current.relative_humidity_2m
        : null,
    windSpeed: round(current.wind_speed_10m),
    windSpeedUnit: data?.current_units?.wind_speed_10m || 'km/h',
  }
}

/** Turns a weather object into a short, readable context string. */
export function formatWeather(weather) {
  if (!weather || typeof weather !== 'object') return null
  const parts = []
  if (weather.condition) parts.push(weather.condition)
  if (typeof weather.temperature === 'number') {
    const temp = `${weather.temperature}°C`
    parts.push(
      typeof weather.feelsLike === 'number'
        ? `${temp} (feels like ${weather.feelsLike}°C)`
        : temp,
    )
  }
  if (typeof weather.humidity === 'number') parts.push(`humidity ${weather.humidity}%`)
  if (typeof weather.windSpeed === 'number') {
    parts.push(`wind ${weather.windSpeed} ${weather.windSpeedUnit || 'km/h'}`)
  }
  if (parts.length === 0) return null
  return weather.location
    ? `${parts.join(', ')} (${weather.location})`
    : parts.join(', ')
}

export function buildSystemPrompt({
  dateTime,
  weatherText,
  weatherUnavailable,
  locationLabel,
  locationUnavailable,
}) {
  const lines = [
    'You are Sun Chat Bot, a helpful AI assistant.',
    '',
    'You have access to the following real-time context:',
    `- Current date/time: ${dateTime}`,
  ]

  if (locationLabel) {
    lines.push(`- User's current location: ${locationLabel}`)
    lines.push(
      '- The location above is real, reverse-geocoded from the user-shared browser location. Use it for location-based questions (what city/region/country they are in, local weather, local time).',
    )
    lines.push(
      '- For questions about nearby places, reason generally from the city/region name only. There is no live places directory connected, so never invent real business names, addresses, phone numbers, or opening hours.',
    )
  } else if (locationUnavailable) {
    lines.push(
      "- Note: the user asked about their location, but location access is not available (permission denied, geolocation unsupported, or the location could not be resolved). Tell the user you do not have access to their location and ask them to allow location sharing or name their city. Do not guess or invent their location.",
    )
  }

  if (weatherText) {
    lines.push(`- Current weather: ${weatherText}`)
    lines.push(
      '- The weather data above was fetched live from a weather service for the given location. If the user asks about the weather, answer directly from that data.',
    )
  } else if (weatherUnavailable) {
    lines.push(
      '- Note: the user asked about the weather, but live weather data could not be retrieved for this request (no location available, or the weather service was unreachable). Tell the user you could not fetch live weather and ask them to share their city or allow location access. Do not invent weather values.',
    )
  }

  lines.push(
    '',
    'Use this information to answer accurately when relevant. Do not claim you lack access to time, weather, or location if this context is provided.',
  )

  return lines.join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method Not Allowed' })
    return
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    send(res, 400, { error: 'Invalid JSON body.' })
    return
  }

  const { messages } = body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    send(res, 400, { error: '`messages` must be a non-empty array.' })
    return
  }

  // Image requests are routed straight to Pollinations (free, keyless) using the
  // latest user message as the prompt; the text/Groq path is untouched otherwise.
  // Detection happens here on the server too (not just the client flag), so a
  // clear image request can never reach the Groq text API.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
  const prompt = lastUserMessage?.content?.trim()
  const clientWantsImage = body?.wantsImage === true
  const serverDetectsImage = !!prompt && isImageQuery(prompt)

  if ((clientWantsImage || serverDetectsImage) && prompt) {
    console.log(
      '[api/chat] image intent detected (client flag:',
      clientWantsImage,
      '/ server keyword check:',
      serverDetectsImage,
      ') → routing to Pollinations for prompt:',
      prompt,
    )
    const imageUrl = buildImageUrl(prompt)
    console.log('[api/chat] Pollinations image URL:', imageUrl)
    send(res, 200, { type: 'image', imageUrl, prompt })
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('[api/chat] GROQ_API_KEY is not configured on the server.')
    send(res, 500, {
      error:
        'Sun Chat Bot is not configured yet. Add the GROQ_API_KEY environment variable in Vercel > Project > Settings > Environment Variables.',
    })
    return
  }

  // Build real-time context (date/time always; weather and location on demand).
  const dateTime =
    formatDateTime(body?.clientTime, body?.timeZone) ||
    formatDateTime(new Date().toISOString()) ||
    'unknown'
  const wantsWeather = body?.wantsWeather === true
  const wantsLocation = body?.wantsLocation === true
  const latitude = typeof body?.latitude === 'number' ? body.latitude : null
  const longitude = typeof body?.longitude === 'number' ? body.longitude : null
  const locationName =
    typeof body?.locationName === 'string' && body.locationName.trim()
      ? body.locationName.trim()
      : null

  let weatherText = null
  let weatherUnavailable = false
  if (latitude !== null && longitude !== null) {
    try {
      const weather = await fetchWeather(latitude, longitude)
      weatherText = formatWeather(weather)
    } catch (error) {
      console.error('[api/chat] weather fetch failed:', error)
      weatherUnavailable = wantsWeather
    }
  } else if (wantsWeather) {
    weatherUnavailable = true
  }

  // Resolve a readable place name when the client sent coords but no label yet.
  let locationLabel = locationName
  let resolvedLocation = null
  if (!locationLabel && latitude !== null && longitude !== null) {
    try {
      resolvedLocation = await reverseGeocode(latitude, longitude)
      locationLabel = resolvedLocation.label
    } catch (error) {
      console.error('[api/chat] reverse geocoding failed:', error)
    }
  }
  const locationUnavailable = wantsLocation && !locationLabel

  const systemPrompt = buildSystemPrompt({
    dateTime,
    weatherText,
    weatherUnavailable,
    locationLabel,
    locationUnavailable,
  })
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL

  let upstream
  let detail = ''
  try {
    upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })
    detail = await upstream.text()
  } catch (error) {
    console.error('[api/chat] network error calling Groq:', error)
    send(res, 502, {
      error: 'Sun Chat Bot could not reach the AI provider. Please try again later.',
    })
    return
  }

  let data
  try {
    data = JSON.parse(detail)
  } catch {
    console.error('[api/chat] non-JSON response from Groq:', detail)
    send(res, 502, {
      error: 'The AI provider returned an unexpected response. Please try again later.',
    })
    return
  }

  if (!upstream.ok) {
    const errorCode = data?.error?.code
    console.error(
      `[api/chat] Groq returned status ${upstream.status} (model "${model}"):`,
      detail,
    )

    const friendly =
      errorCode === 'model_not_found' || data?.error?.type === 'invalid_request_error'
        ? 'This model is unavailable, please try again later.'
        : `The AI provider could not complete the request (status ${upstream.status}). Please try again later.`

    send(res, 502, { error: friendly })
    return
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    console.error('[api/chat] Groq returned success without message content:', detail)
    send(res, 502, {
      error: 'The AI provider returned an empty response. Please try again later.',
    })
    return
  }

  send(res, 200, {
    content,
    ...(resolvedLocation ? { location: resolvedLocation } : {}),
  })
}