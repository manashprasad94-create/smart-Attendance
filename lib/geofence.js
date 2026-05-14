export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function checkGeofence(hostLat, hostLng, radiusMeters = 100) {
  const enabled = process.env.NEXT_PUBLIC_GEOFENCING_ENABLED === 'true'

  // If turned off, always allow
  if (!enabled) return { allowed: true, reason: 'Geofencing disabled' }

  // If no host location stored, allow
  if (!hostLat || !hostLng) return { allowed: true, reason: 'No host location set' }

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ allowed: false, reason: 'Your browser does not support location. Please ask your host for help.' })
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
          resolve({
            allowed: false,
            reason: `You appear to be ${Math.round(distance)}m away from the classroom. You must be within ${radiusMeters}m to mark attendance.`
          })
        }
      },
      (err) => {
        if (err.code === 1) {
          resolve({ allowed: false, reason: 'Location permission denied. Please allow location access and try again.' })
        } else {
          resolve({ allowed: false, reason: 'Could not get your location. Please try again.' })
        }
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    )
  })
}