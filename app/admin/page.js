'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Admin() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')

  const [session, setSession] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [duration, setDuration] = useState(5)
  const [attendance, setAttendance] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [subject, setSubject] = useState('')
  const [radius, setRadius] = useState(100)
  const [geoEnabled, setGeoEnabled] = useState(true)

  async function handleLogin() {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput })
    })
    if (res.ok) {
      setAuthed(true)
      setAuthError('')
    } else {
      setAuthError('Incorrect password. Try again.')
    }
  }

  useEffect(() => {
    if (!authed) return
    fetchSession()
    fetchAllStudents()
    const interval = setInterval(fetchSession, 5000)
    return () => clearInterval(interval)
  }, [authed])

  useEffect(() => {
    if (!session) return
    const tick = setInterval(() => {
      const remaining = new Date(session.expires_at) - Date.now()
      if (remaining <= 0) {
        setSession(null)
        setTimeLeft(null)
        return
      }
      setTimeLeft(remaining)
    }, 500)
    return () => clearInterval(tick)
  }, [session])

  useEffect(() => {
    if (!session) return
    fetchAttendance(session.id)
    const interval = setInterval(() => fetchAttendance(session.id), 4000)
    return () => clearInterval(interval)
  }, [session])

  async function fetchSession() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()
    setSession(data || null)
    if (data) fetchAttendance(data.id)
  }

  async function fetchAllStudents() {
    const { data } = await supabase
      .from('students')
      .select('*')
      .order('roll_number')
    setAllStudents(data || [])
  }

  async function fetchAttendance(sessionId) {
    const { data } = await supabase
      .from('attendance')
      .select('*, students(name, roll_number)')
      .eq('session_id', sessionId)
      .order('submitted_at')
    setAttendance(data || [])
  }

async function startSession() {
  setLoading(true)

  // Get host's location first
  let hostLat = null
  let hostLng = null

  await new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        hostLat = pos.coords.latitude
        hostLng = pos.coords.longitude
        resolve()
      },
      () => resolve(), // if location fails, session still starts without geofencing
      { timeout: 8000, enableHighAccuracy: true }
    )
  })

  await supabase
    .from('sessions')
    .update({ is_active: false })
    .eq('is_active', true)

  const expires = new Date(Date.now() + duration * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      expires_at: expires,
      duration_minutes: duration,
      is_active: true,
      host_lat: hostLat,
      host_lng: hostLng,
      geo_radius: radius,
      geo_enabled: geoEnabled
    })
    .select()
    .single()

  if (!error) {
    setSession(data)
    setAttendance([])
    setSessionStarted(true)
    setTimeout(() => setSessionStarted(false), 4000)
  }
  setLoading(false)
}

  async function closeSession() {
    if (!session) return
    await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('id', session.id)
    setSession(null)
    setTimeLeft(null)
  }

  function formatTime(ms) {
    if (!ms) return '--:--'
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const presentStudents = [...attendance]
    .filter(a => a.students)
    .sort((a, b) => {
      const rollA = a.students.roll_number.toString().padStart(10, '0')
      const rollB = b.students.roll_number.toString().padStart(10, '0')
      return rollA.localeCompare(rollB)
    })

    function copyAttendance() {
    const lines = presentStudents.map(a =>
        `${a.students.roll_number}  ${a.students.name}`
    )
    const text =
        `Subject: ${subject || 'N/A'}\n` +
        `Date: ${new Date().toLocaleDateString()}\n` +
        `Total Present: ${presentStudents.length} / ${allStudents.length}\n\n` +
        lines.join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    }

  const isOpen = !!session && !!timeLeft

  // ── Password screen ──────────────────────────────────
  if (!authed) {
    return (
      <main style={{
        fontFamily: "'DM Sans', sans-serif",
        background: '#F7F4EF',
        minHeight: '100vh',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          input { font-size: 16px !important; }
          input:focus { outline: none; border-color: #185FA5 !important; }
        `}</style>
        <div style={{
          background: '#fff',
          borderRadius: 24,
          border: '0.5px solid #D3D1C7',
          padding: '2.5rem 1.75rem',
          width: '100%',
          maxWidth: 380,
          textAlign: 'center'
        }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28, color: '#2C2C2A', marginBottom: '0.5rem'
          }}>
            Admin Access
          </h1>
          <p style={{ fontSize: 13, color: '#888780', marginBottom: '2rem' }}>
            Enter your admin password to continue
          </p>
          {authError && (
            <div style={{
              background: '#FCEBEB', border: '0.5px solid #F09595',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: '1rem', fontSize: 13, color: '#A32D2D'
            }}>
              {authError}
            </div>
          )}
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 12, border: '0.5px solid #D3D1C7',
              fontSize: 16, color: '#2C2C2A',
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: '1rem', minHeight: 52
            }}
          />
          <button
            onClick={handleLogin}
            style={{
              width: '100%', padding: '15px',
              borderRadius: 12, border: 'none',
              background: '#185FA5', color: '#fff',
              fontSize: 16, fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              minHeight: 52,
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            Enter
          </button>
        </div>
      </main>
    )
  }

  // ── Admin panel ──────────────────────────────────────
  return (
    <main style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#F7F4EF',
      minHeight: '100vh',
      minHeight: '100dvh'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F4EF; }
      `}</style>

      {/* Session started popup */}
      {sessionStarted && (
        <div style={{
          position: 'fixed', top: 16, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999, background: '#fff',
          border: '0.5px solid #D3D1C7',
          borderRadius: 16, padding: '1rem 1.5rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center',
          gap: 12, width: 'calc(100% - 2rem)',
          maxWidth: 360
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#EAF3DE',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16, flexShrink: 0
          }}>
            ✓
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A', marginBottom: 2 }}>
              Session Started!
            </p>
            <p style={{ fontSize: 12, color: '#3B6D11' }}>
              {duration} min · ends at{' '}
              {session
                ? new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        borderBottom: '0.5px solid #E8E5DF',
        minHeight: 56
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: '#fff',
            border: '0.5px solid #D3D1C7',
            borderRadius: 20,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 500,
            color: '#5F5E5A',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            minHeight: 44,
            minWidth: 80,
            WebkitTapHighlightColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          ← Back
        </button>
        <button
  onClick={() => router.push('/admin/history')}
  style={{
    background: '#fff', border: '0.5px solid #D3D1C7',
    borderRadius: 20, padding: '8px 18px',
    fontSize: 13, fontWeight: 500, color: '#5F5E5A',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    minHeight: 44,
    WebkitTapHighlightColor: 'transparent'
  }}
>
  History
</button>

        <span style={{
          fontSize: 12, fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#5F5E5A'
        }}>
          Admin Panel
        </span>

        <span style={{
          background: isOpen ? '#E6F1FB' : '#EAF3DE',
          color: isOpen ? '#185FA5' : '#3B6D11',
          fontSize: 11, fontWeight: 500,
          padding: '5px 12px', borderRadius: 20
        }}>
          {isOpen ? 'Live' : 'Closed'}
        </span>
      </nav>

      <div style={{ padding: '1.5rem 1.25rem 4rem', maxWidth: 600, margin: '0 auto' }}>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28, color: '#2C2C2A', marginBottom: '0.3rem'
        }}>
          Manage <span style={{ color: '#185FA5' }}>Session</span>
        </h1>
        <p style={{ fontSize: 13, color: '#888780', marginBottom: '1.5rem' }}>
          Start a session, monitor attendance, and copy the report.
        </p>

        {/* Session control card */}
        <div style={{
          background: '#fff', borderRadius: 20,
          border: '0.5px solid #D3D1C7',
          padding: '1.5rem', marginBottom: '1.25rem'
        }}>
          {isOpen ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: '1rem'
              }}>
                <div>
                  <p style={{
                    fontSize: 11, color: '#888780',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em', marginBottom: 4
                  }}>
                    Time Remaining
                  </p>
                  <span style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 42, fontWeight: 700, color: '#2C2C2A'
                  }}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>Closes at</p>
                  <p style={{ fontSize: 18, fontWeight: 500, color: '#2C2C2A' }}>
                    {new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px', background: '#F7F4EF',
                borderRadius: 10, marginBottom: '1.25rem'
              }}>
                <span style={{ fontSize: 13, color: '#5F5E5A' }}>
                  {presentStudents.length} of {allStudents.length} present
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#185FA5' }}>
                  {allStudents.length > 0
                    ? Math.round((presentStudents.length / allStudents.length) * 100)
                    : 0}%
                </span>
              </div>

              <button
                onClick={closeSession}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 12,
                  border: '0.5px solid #F09595',
                  background: '#FCEBEB', color: '#A32D2D',
                  fontSize: 15, fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  minHeight: 52,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                Close Session Early
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#5F5E5A', marginBottom: '1.25rem', fontWeight: 500 }}>
                Start a new attendance session
              </p>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block', fontSize: 12, color: '#888780',
                  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10
                }}>
                  Session Duration
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  {[3, 5, 10, 15].map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      style={{
                        padding: '12px 0', borderRadius: 10,
                        fontSize: 14, fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        minHeight: 48,
                        border: duration === d ? '2px solid #185FA5' : '0.5px solid #D3D1C7',
                        background: duration === d ? '#E6F1FB' : '#fff',
                        color: duration === d ? '#185FA5' : '#5F5E5A',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Geofencing toggle */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: geoEnabled ? '#E6F1FB' : '#F7F4EF',
                borderRadius: 12, marginBottom: '1.25rem',
                border: geoEnabled ? '0.5px solid #B5D4F4' : '0.5px solid #D3D1C7'
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A', marginBottom: 2 }}>
                    Geofencing
                  </p>
                  <p style={{ fontSize: 12, color: '#888780' }}>
                    {geoEnabled ? 'Students must be in the classroom' : 'Location not required'}
                  </p>
                </div>
                <button
                  onClick={() => setGeoEnabled(!geoEnabled)}
                  style={{
                    width: 52, height: 28, borderRadius: 20,
                    border: 'none', cursor: 'pointer',
                    background: geoEnabled ? '#185FA5' : '#D3D1C7',
                    position: 'relative', transition: 'background 0.2s',
                    WebkitTapHighlightColor: 'transparent',
                    flexShrink: 0
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 3,
                    left: geoEnabled ? 26 : 3,
                    width: 22, height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s'
                  }} />
                </button>
              </div>

              {/* Radius picker */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block', fontSize: 12, color: '#888780',
                  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10
                }}>
                  Allowed Radius
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  {[50, 100, 200, 500].map(r => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      style={{
                        padding: '12px 0', borderRadius: 10,
                        fontSize: 13, fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        minHeight: 48,
                        border: radius === r ? '2px solid #185FA5' : '0.5px solid #D3D1C7',
                        background: radius === r ? '#E6F1FB' : '#fff',
                        color: radius === r ? '#185FA5' : '#5F5E5A',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      {r} m
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={startSession}
                disabled={loading}
                style={{
                  width: '100%', padding: '15px',
                  borderRadius: 12, border: 'none',
                  background: loading ? '#F1EFE8' : '#185FA5',
                  color: loading ? '#B4B2A9' : '#fff',
                  fontSize: 16, fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  minHeight: 52,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {loading ? 'Starting...' : `Start ${duration}-Minute Session`}
              </button>
            </>
          )}
        </div>

        {/* Present students list */}
        {presentStudents.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 20,
            border: '0.5px solid #D3D1C7', padding: '1.5rem'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: '1.25rem'
            }}>
              <div>
                <h2 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18, color: '#2C2C2A', marginBottom: 2
                }}>
                  Present Students
                </h2>
                <p style={{ fontSize: 12, color: '#888780' }}>
                  {presentStudents.length} of {allStudents.length} · by roll number
                </p>
              </div>
              <button
                onClick={copyAttendance}
                style={{
                  padding: '8px 18px', borderRadius: 10,
                  border: '0.5px solid #D3D1C7',
                  background: copied ? '#EAF3DE' : '#fff',
                  color: copied ? '#3B6D11' : '#5F5E5A',
                  fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  minHeight: 44,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {copied ? '✓ Copied' : 'Copy List'}
              </button>
            </div>

            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '80px 1fr',
              gap: 12, padding: '8px 12px',
              background: '#F7F4EF', borderRadius: 8, marginBottom: 6
            }}>
              <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Roll</span>
              <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Name</span>
            </div>

            {/* Rows */}
            {presentStudents.map(a => (
              <div
                key={a.id}
                style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr',
                  gap: 12, padding: '12px',
                  borderBottom: '0.5px solid #F1EFE8',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: 13, color: '#888780' }}>
                  {a.students.roll_number}
                </span>
                <span style={{ fontSize: 15, color: '#2C2C2A', fontWeight: 500 }}>
                  {a.students.name}
                </span>
              </div>
            ))}

            <p style={{
              fontSize: 11, color: '#B4B2A9',
              marginTop: '1rem', textAlign: 'center'
            }}>
              Updates live · Copy List to share with teacher
            </p>
          </div>
        )}

        {/* Empty state */}
        {isOpen && presentStudents.length === 0 && (
          <div style={{
            background: '#fff', borderRadius: 20,
            border: '0.5px solid #D3D1C7',
            padding: '2.5rem 1.5rem', textAlign: 'center'
          }}>
            <p style={{ fontSize: 14, color: '#B4B2A9' }}>
              Waiting for students to mark attendance...
            </p>
          </div>
        )}
      </div>
    </main>
  )
}