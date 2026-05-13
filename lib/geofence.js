// ─── TOGGLE THIS TO ENABLE/DISABLE GEOFENCING ───────────────────
const GEOFENCING_ENABLED = process.env.NEXT_PUBLIC_GEOFENCING_ENABLED === 'true'
// ────────────────────────────────────────────────────────────────

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth radius in meters
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function checkGeofence(hostLat, hostLng, radiusMeters = 100) {
  // If feature is off, always allow
  if (!GEOFENCING_ENABLED) return { allowed: true, reason: 'Geofencing disabled' }

  // If no host location stored, allow
  if (!hostLat || !hostLng) return { allowed: true, reason: 'No host location set' }

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ allowed: false, reason: 'Your browser does not support location access' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distance = getDistanceMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          hostLat,
          hostLng
        )
        if (distance <= radiusMeters) {
          resolve({ allowed: true, reason: 'Within range' })
        } else {
          resolve({ allowed: false, reason: `You are ${Math.round(distance)}m away. Must be within ${radiusMeters}m.` })
        }
      },
      () => resolve({ allowed: false, reason: 'Location permission denied' })
    )
  })
}