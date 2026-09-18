import { reverseGeocode } from '../lib/geocode.js'

function send(res, status, body) {
  res.status(status).json(body)
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

  const latitude = Number(body?.latitude)
  const longitude = Number(body?.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    send(res, 400, { error: '`latitude` and `longitude` must be numbers.' })
    return
  }

  try {
    const location = await reverseGeocode(latitude, longitude)
    send(res, 200, { ...location, latitude, longitude })
  } catch (error) {
    console.error('[api/location] reverse geocoding failed:', error)
    send(res, 502, { error: 'Could not resolve your location. Please try again later.' })
  }
}