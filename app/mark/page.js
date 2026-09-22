'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

export default function MarkAttendance() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [roll, setRoll] = useState('')
  const [session, setSession] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSession()
  }, [])

  useEffect(() => {
    if (!session) return

    const tick = setInterval(() => {
      const remaining = new Date(session.expires_at) - Date.now()

      if (remaining <= 0) {
        setSession(null)
        setTimeLeft(null)
        setStatus('error')
        setMessage('Session has closed. You can no longer mark attendance.')
        return
      }

      setTimeLeft(remaining)
    }, 500)

    return () => clearInterval(tick)
  }, [session])

  async function fetchSession() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!data) {
      setStatus('error')
      setMessage('No active session. Please wait for your host to open attendance.')
      return
    }

    setSession(data)
  }

  function formatTime(ms) {
    if (!ms) return '--:--'

    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)

    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  async function handleSubmit() {
    if (!name.trim() || !roll.trim()) {
      setStatus('error')
      setMessage('Please fill in both your name and roll number.')
      return
    }

    if (!session) {
      setStatus('error')
      setMessage('No active session found.')
      return
    }

    setLoading(true)
    setStatus(null)
    setMessage('')

    let studentLat = null
    let studentLng = null

    // Get location if geofencing enabled
    if (session.geo_enabled) {
      setMessage('Getting your location...')

      const locationResult = await new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({
            error: 'Your browser does not support location access.'
          })
          return
        }

        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            }),

          (err) => {
            if (err.code === 1) {
              resolve({
                error:
                  'Location permission denied. Please allow location and try again.'
              })
            } else {
              resolve({
                error: 'Could not get your location. Please try again.'
              })
            }
          },

          {
            timeout: 10000,
            maximumAge: 0,
            enableHighAccuracy: true
          }
        )
      })

      if (locationResult.error) {
        setStatus('error')
        setMessage(locationResult.error)
        setLoading(false)
        return
      }

      studentLat = locationResult.lat
      studentLng = locationResult.lng

      setMessage('')
    }

    try {
      // Generate device fingerprint
      const fp = await FingerprintJS.load({ monitoring: false })
      const result = await fp.get()

      const deviceId = result.visitorId
      console.log('DEVICE ID:', deviceId)

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          name: name.trim(),
          roll: roll.trim(),
          sessionId: session.id,
          studentLat,
          studentLng,
          deviceId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong.')
      } else {
        setStatus('success')
        setMessage(`Attendance marked! Welcome, ${data.name}.`)
      }
    } catch (err) {
      console.error(err)

      setStatus('error')
      setMessage('Network error. Please try again.')
    }

    setLoading(false)
  }

  const isOpen = !!session && !!timeLeft

  return (
    <main
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: '#F7F4EF',
        minHeight: '100vh',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background: #F7F4EF;
        }

        input {
          font-size: 16px !important;
        }

        input:focus {
          outline: none;
          border-color: #185FA5 !important;
        }
      `}</style>

      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '0.5px solid #E8E5DF'
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: '#5F5E5A',
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 0',
            minHeight: 44,
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          ← Back
        </button>

        {isOpen && (
          <span
            style={{
              background: '#FFF3E0',
              color: '#E65100',
              fontSize: 12,
              fontWeight: 500,
              padding: '5px 14px',
              borderRadius: 20
            }}
          >
            ⏱ {formatTime(timeLeft)}
          </span>
        )}
      </nav>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem 1.25rem 2rem'
        }}
      >
        {/* Status */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: '#fff',
            border: '0.5px solid #D3D1C7',
            borderRadius: 20,
            padding: '6px 16px',
            fontSize: 12,
            color: '#5F5E5A',
            marginBottom: '1.25rem'
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isOpen ? '#639922' : '#D3D1C7',
              display: 'inline-block'
            }}
          />

          {isOpen ? 'Session is open' : 'Session closed'}
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 30,
            fontWeight: 700,
            color: '#2C2C2A',
            marginBottom: '0.4rem',
            textAlign: 'center'
          }}
        >
          Mark Your <span style={{ color: '#185FA5' }}>Attendance</span>
        </h1>

        <p
          style={{
            fontSize: 13,
            color: '#888780',
            marginBottom: '2rem',
            textAlign: 'center',
            lineHeight: 1.6
          }}
        >
          Enter your details exactly as registered
        </p>

        {/* Form card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 24,
            border: '0.5px solid #D3D1C7',
            padding: '1.75rem 1.5rem',
            width: '100%',
            maxWidth: 400
          }}
        >
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#EAF3DE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  fontSize: 28
                }}
              >
                ✓
              </div>

              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 24,
                  color: '#2C2C2A',
                  marginBottom: '0.5rem'
                }}
              >
                All Done!
              </h2>

              <p
                style={{
                  fontSize: 14,
                  color: '#3B6D11',
                  lineHeight: 1.6
                }}
              >
                {message}
              </p>
            </div>
          ) : (
            <>
              {status === 'error' && (
                <div
                  style={{
                    background: '#FCEBEB',
                    border: '0.5px solid #F09595',
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: '1.25rem',
                    fontSize: 13,
                    color: '#A32D2D',
                    lineHeight: 1.6
                  }}
                >
                  {message}
                </div>
              )}

              {/* Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#5F5E5A',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em'
                  }}
                >
                  Full Name
                </label>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isOpen || loading}
                  autoComplete="name"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 12,
                    border: '0.5px solid #D3D1C7',
                    fontSize: 16,
                    color: '#2C2C2A',
                    background: isOpen ? '#fff' : '#F7F4EF',
                    fontFamily: "'DM Sans', sans-serif",
                    minHeight: 52
                  }}
                />
              </div>

              {/* Roll */}
              <div style={{ marginBottom: '2rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#5F5E5A',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em'
                  }}
                >
                  Roll Number
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter your 2 Digit roll number"
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  disabled={!isOpen || loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 12,
                    border: '0.5px solid #D3D1C7',
                    fontSize: 16,
                    color: '#2C2C2A',
                    background: isOpen ? '#fff' : '#F7F4EF',
                    fontFamily: "'DM Sans', sans-serif",
                    minHeight: 52
                  }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!isOpen || loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 14,
                  border: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: isOpen && !loading ? 'pointer' : 'not-allowed',
                  background:
                    isOpen && !loading ? '#185FA5' : '#F1EFE8',
                  color:
                    isOpen && !loading ? '#fff' : '#B4B2A9',
                  transition: 'all 0.18s',
                  minHeight: 52,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {loading ? 'Submitting...' : 'Submit Attendance'}
              </button>

              <p
                style={{
                  fontSize: 11,
                  color: '#B4B2A9',
                  textAlign: 'center',
                  marginTop: '1rem',
                  lineHeight: 1.6
                }}
              >
                Name and roll must match exactly as registered
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}