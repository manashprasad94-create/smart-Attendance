'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MarkAttendance() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [roll, setRoll] = useState('')
  const [session, setSession] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [status, setStatus] = useState(null) // 'success' | 'error'
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

    // Step 1 — validate student exists in database
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .ilike('name', name.trim())
      .eq('roll_number', roll.trim())
      .single()

    if (studentError || !student) {
      setStatus('error')
      setMessage('Name and roll number do not match our records. Please check and try again.')
      setLoading(false)
      return
    }

    // Step 2 — check if already marked
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', session.id)
      .eq('student_id', student.id)
      .single()

    if (existing) {
      setStatus('error')
      setMessage('You have already marked your attendance for this session.')
      setLoading(false)
      return
    }

    // Step 3 — insert attendance
    const { error: insertError } = await supabase
      .from('attendance')
      .insert({ session_id: session.id, student_id: student.id })

    if (insertError) {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setStatus('success')
    setMessage(`Attendance marked successfully! Welcome, ${student.name}.`)
    setLoading(false)
  }

  const isOpen = !!session && !!timeLeft

  return (
    <main style={{ fontFamily: "'DM Sans', sans-serif", background: '#F7F4EF', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F4EF; }
        input:focus { outline: none; border-color: #185FA5 !important; }
      `}</style>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2.5rem' }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#5F5E5A', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back
        </button>
        {isOpen && (
          <span style={{ background: '#FFF3E0', color: '#E65100', fontSize: 12, fontWeight: 500, padding: '4px 14px', borderRadius: 20 }}>
            ⏱ {formatTime(timeLeft)} remaining
          </span>
        )}
      </nav>

      {/* Form area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 20, padding: '5px 16px', fontSize: 12, color: '#5F5E5A', marginBottom: '1.5rem' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOpen ? '#639922' : '#D3D1C7', display: 'inline-block' }} />
          {isOpen ? 'Session is open' : 'Session closed'}
        </div>

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: '#2C2C2A', marginBottom: '0.5rem', textAlign: 'center' }}>
          Mark Your <span style={{ color: '#185FA5' }}>Attendance</span>
        </h1>
        <p style={{ fontSize: 14, color: '#888780', marginBottom: '2.5rem', textAlign: 'center' }}>
          Enter your details exactly as registered
        </p>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, border: '0.5px solid #D3D1C7', padding: '2rem', width: '100%', maxWidth: 440 }}>

          {/* Success state */}
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: 26 }}>
                ✓
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#2C2C2A', marginBottom: '0.5rem' }}>Done!</h2>
              <p style={{ fontSize: 14, color: '#3B6D11', lineHeight: 1.6 }}>{message}</p>
              <button
                onClick={() => router.push('/')}
                style={{ marginTop: '1.5rem', padding: '10px 28px', borderRadius: 12, border: '0.5px solid #D3D1C7', background: '#F7F4EF', fontSize: 13, fontWeight: 500, color: '#5F5E5A', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Back to Home
              </button>
            </div>
          ) : (
            <>
              {/* Error banner */}
              {status === 'error' && (
                <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 10, padding: '10px 14px', marginBottom: '1.25rem', fontSize: 13, color: '#A32D2D', lineHeight: 1.5 }}>
                  {message}
                </div>
              )}

              {/* Name field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!isOpen || loading}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '0.5px solid #D3D1C7', fontSize: 14, color: '#2C2C2A', background: isOpen ? '#fff' : '#F7F4EF', fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>

              {/* Roll field */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Roll Number
                </label>
                <input
                  type="text"
                  placeholder="Enter your roll number"
                  value={roll}
                  onChange={e => setRoll(e.target.value)}
                  disabled={!isOpen || loading}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '0.5px solid #D3D1C7', fontSize: 14, color: '#2C2C2A', background: isOpen ? '#fff' : '#F7F4EF', fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!isOpen || loading}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 500,
                  cursor: isOpen && !loading ? 'pointer' : 'not-allowed',
                  background: isOpen && !loading ? '#185FA5' : '#F1EFE8',
                  color: isOpen && !loading ? '#fff' : '#B4B2A9',
                  transition: 'all 0.18s'
                }}
              >
                {loading ? 'Submitting...' : 'Submit Attendance'}
              </button>

              <p style={{ fontSize: 11, color: '#B4B2A9', textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
                Your name and roll number must match exactly as registered by your host
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}