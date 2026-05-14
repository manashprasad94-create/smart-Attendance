'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function History() {
  const router = useRouter()
  const [sessions, setSessions] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [attendanceMap, setAttendanceMap] = useState({})
  const [subjectMap, setSubjectMap] = useState({})
  const [copiedId, setCopiedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [authed, setAuthed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')

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
    fetchSessions()
    fetchAllStudents()
  }, [authed])

  async function fetchSessions() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
    setSessions(data || [])
  }

  async function fetchAllStudents() {
    const { data } = await supabase
      .from('students')
      .select('*')
      .order('roll_number')
    setAllStudents(data || [])
  }

  async function fetchAttendance(sessionId) {
    if (attendanceMap[sessionId]) return
    const { data } = await supabase
      .from('attendance')
      .select('*, students(name, roll_number)')
      .eq('session_id', sessionId)
      .order('submitted_at')

    const sorted = (data || [])
      .filter(a => a.students)
      .sort((a, b) => {
        const rollA = a.students.roll_number.toString().padStart(10, '0')
        const rollB = b.students.roll_number.toString().padStart(10, '0')
        return rollA.localeCompare(rollB)
      })

    setAttendanceMap(prev => ({ ...prev, [sessionId]: sorted }))
  }

  async function deleteSession(sessionId) {
    setDeletingId(sessionId)
    await supabase.from('attendance').delete().eq('session_id', sessionId)
    await supabase.from('sessions').delete().eq('id', sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    setAttendanceMap(prev => {
      const copy = { ...prev }
      delete copy[sessionId]
      return copy
    })
    if (expandedId === sessionId) setExpandedId(null)
    setDeletingId(null)
  }

  function copyAttendance(sessionId) {
    const list = attendanceMap[sessionId] || []
    const subject = subjectMap[sessionId] || ''
    const session = sessions.find(s => s.id === sessionId)
    const lines = list.map(a => `${a.students.roll_number}  ${a.students.name}`)
    const text =
      `Subject: ${subject || 'N/A'}\n` +
      `Date: ${new Date(session.created_at).toLocaleDateString()}\n` +
      `Total Present: ${list.length} / ${allStudents.length}\n\n` +
      lines.join('\n')
    navigator.clipboard.writeText(text)
    setCopiedId(sessionId)
    setTimeout(() => setCopiedId(null), 2500)
  }

  // ── Password screen ──────────────────────────────────
  if (!authed) {
    return (
      <main style={{
        fontFamily: "'DM Sans', sans-serif",
        background: '#F7F4EF',
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
          background: '#fff', borderRadius: 24,
          border: '0.5px solid #D3D1C7',
          padding: '2.5rem 1.75rem',
          width: '100%', maxWidth: 380, textAlign: 'center'
        }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: '#2C2C2A', marginBottom: '0.5rem' }}>
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

  // ── History page ─────────────────────────────────────
  return (
    <main style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#F7F4EF',
      minHeight: '100dvh'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F4EF; }
        input:focus { outline: none; border-color: #185FA5 !important; }
      `}</style>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        borderBottom: '0.5px solid #E8E5DF',
        minHeight: 56
      }}>
        <button
          onClick={() => router.push('/admin')}
          style={{
            background: '#fff', border: '0.5px solid #D3D1C7',
            borderRadius: 20, padding: '8px 18px',
            fontSize: 13, fontWeight: 500, color: '#5F5E5A',
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            minHeight: 44, minWidth: 80,
            WebkitTapHighlightColor: 'transparent',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          ← Back
        </button>
        <span style={{
          fontSize: 12, fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#5F5E5A'
        }}>
          Session History
        </span>
        <div style={{ width: 80 }} />
      </nav>

      <div style={{ padding: '1.5rem 1.25rem 4rem', maxWidth: 600, margin: '0 auto' }}>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28, color: '#2C2C2A', marginBottom: '0.3rem'
        }}>
          Last <span style={{ color: '#185FA5' }}>3 Sessions</span>
        </h1>
        <p style={{ fontSize: 13, color: '#888780', marginBottom: '1.5rem' }}>
          Tap a session to view attendance. Delete when no longer needed.
        </p>

        {sessions.length === 0 && (
          <div style={{
            background: '#fff', borderRadius: 20,
            border: '0.5px solid #D3D1C7',
            padding: '2.5rem', textAlign: 'center'
          }}>
            <p style={{ fontSize: 14, color: '#B4B2A9' }}>No sessions recorded yet</p>
          </div>
        )}

        {sessions.map((s, index) => {
          const isExpanded = expandedId === s.id
          const list = attendanceMap[s.id] || []
          const date = new Date(s.created_at)

          return (
            <div
              key={s.id}
              style={{
                background: '#fff',
                borderRadius: 16,
                border: isExpanded ? '1.5px solid #185FA5' : '0.5px solid #D3D1C7',
                marginBottom: 12,
                overflow: 'hidden'
              }}
            >
              {/* Session header */}
              <div
                onClick={async () => {
                  if (isExpanded) {
                    setExpandedId(null)
                  } else {
                    setExpandedId(s.id)
                    await fetchAttendance(s.id)
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>
                      {date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {index === 0 && (
                      <span style={{
                        background: '#E6F1FB', color: '#185FA5',
                        fontSize: 10, fontWeight: 500,
                        padding: '2px 8px', borderRadius: 20
                      }}>
                        Latest
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#888780' }}>
                    {s.duration_minutes} min
                    {' · '}
                    {s.geo_enabled ? 'Geo on' : 'Geo off'}
                    {attendanceMap[s.id]
                      ? ` · ${attendanceMap[s.id].length} present`
                      : ''}
                  </p>
                </div>
                <span style={{ fontSize: 18, color: '#B4B2A9' }}>
                  {isExpanded ? '↑' : '↓'}
                </span>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{
                  borderTop: '0.5px solid #F1EFE8',
                  padding: '1.25rem 1rem'
                }}>
                  {list.length === 0 ? (
                    <p style={{
                      fontSize: 13, color: '#B4B2A9',
                      textAlign: 'center', padding: '1rem 0'
                    }}>
                      No attendance was marked in this session
                    </p>
                  ) : (
                    <>
                      {/* Subject input */}
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                          display: 'block', fontSize: 11, color: '#888780',
                          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6
                        }}>
                          Subject (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Mathematics, Physics..."
                          value={subjectMap[s.id] || ''}
                          onChange={e => setSubjectMap(prev => ({
                            ...prev, [s.id]: e.target.value
                          }))}
                          style={{
                            width: '100%', padding: '10px 14px',
                            borderRadius: 10, border: '0.5px solid #D3D1C7',
                            fontSize: 14, color: '#2C2C2A',
                            fontFamily: "'DM Sans', sans-serif",
                            minHeight: 44, background: '#fff'
                          }}
                        />
                      </div>

                      {/* Stats + copy */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#F7F4EF', borderRadius: 10,
                        marginBottom: '1rem'
                      }}>
                        <span style={{ fontSize: 13, color: '#5F5E5A' }}>
                          {list.length} of {allStudents.length} present
                        </span>
                        <button
                          onClick={() => copyAttendance(s.id)}
                          style={{
                            padding: '6px 16px', borderRadius: 10,
                            border: '0.5px solid #D3D1C7',
                            background: copiedId === s.id ? '#EAF3DE' : '#fff',
                            color: copiedId === s.id ? '#3B6D11' : '#5F5E5A',
                            fontSize: 12, fontWeight: 500,
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            minHeight: 36,
                            WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          {copiedId === s.id ? '✓ Copied' : 'Copy List'}
                        </button>
                      </div>

                      {/* Table header */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '80px 1fr',
                        gap: 12, padding: '6px 12px',
                        background: '#F7F4EF', borderRadius: 8, marginBottom: 4
                      }}>
                        <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Roll</span>
                        <span style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Name</span>
                      </div>

                      {/* Rows */}
                      {list.map(a => (
                        <div
                          key={a.id}
                          style={{
                            display: 'grid', gridTemplateColumns: '80px 1fr',
                            gap: 12, padding: '10px 12px',
                            borderBottom: '0.5px solid #F1EFE8',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ fontSize: 13, color: '#888780' }}>
                            {a.students.roll_number}
                          </span>
                          <span style={{ fontSize: 14, color: '#2C2C2A', fontWeight: 500 }}>
                            {a.students.name}
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => deleteSession(s.id)}
                    disabled={deletingId === s.id}
                    style={{
                      width: '100%', marginTop: '1.25rem',
                      padding: '12px', borderRadius: 12,
                      border: '0.5px solid #F09595',
                      background: '#FCEBEB', color: '#A32D2D',
                      fontSize: 14, fontWeight: 500,
                      cursor: deletingId === s.id ? 'not-allowed' : 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      minHeight: 48,
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {deletingId === s.id ? 'Deleting...' : 'Delete This Session'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}