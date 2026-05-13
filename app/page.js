'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    fetchSession()
    const interval = setInterval(fetchSession, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!session) return
    const tick = setInterval(() => {
      const remaining = new Date(session.expires_at) - Date.now()
      if (remaining <= 0) { setSession(null); setTimeLeft(null); return }
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
    setSession(data || null)
  }

  function formatTime(ms) {
    if (!ms) return '--:--'
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const isOpen = !!session && !!timeLeft

  return (
    <main style={{ fontFamily: "'DM Sans', sans-serif", background: '#F7F4EF', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F4EF; }
      `}</style>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2.5rem' }}>
        <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5F5E5A' }}>
          Attendance Portal
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: isOpen ? '#E6F1FB' : '#EAF3DE',
            color: isOpen ? '#185FA5' : '#3B6D11',
            fontSize: 11, fontWeight: 500, padding: '4px 14px', borderRadius: 20
          }}>
            {isOpen ? 'Session active' : 'No active session'}
          </span>
          <button
            onClick={() => router.push('/admin')}
            style={{
              background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 20,
              padding: '4px 16px', fontSize: 12, fontWeight: 500, color: '#5F5E5A',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
            }}
          >
            Admin
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 1.5rem 0' }}>

        {/* Status tag */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 20, padding: '5px 16px', fontSize: 12, color: '#5F5E5A', marginBottom: '1.5rem' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOpen ? '#639922' : '#D3D1C7', display: 'inline-block' }} />
          {isOpen ? 'Session live' : 'Session closed'}
        </div>

        {/* Heading */}
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.15, marginBottom: '1rem', maxWidth: 520 }}>
          Smart <span style={{ color: '#185FA5' }}>Attendance</span> System
        </h1>
        <p style={{ fontSize: 15, color: '#888780', maxWidth: 380, lineHeight: 1.7, marginBottom: '2.5rem' }}>
          Mark your attendance quickly and securely. The session window is time-limited — submit before it closes.
        </p>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, border: '0.5px solid #D3D1C7', padding: '1.75rem 2rem', width: '100%', maxWidth: 460, marginBottom: '1.5rem' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: 12, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Session Status</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: isOpen ? '#3B6D11' : '#A32D2D' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOpen ? '#639922' : '#D3D1C7' }} />
              {isOpen ? 'Live' : 'Closed'}
            </span>
          </div>

          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: isOpen ? '#2C2C2A' : '#D3D1C7' }}>
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: 12, color: '#888780' }}>remaining</span>
          </div>

          <p style={{ fontSize: 12, color: '#B4B2A9', marginBottom: '1.5rem' }}>
            {session
              ? `Opened at ${new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · closes at ${new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Waiting for host to open session...'}
          </p>

          <button
            onClick={() => isOpen && router.push('/mark')}
            disabled={!isOpen}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 500,
              cursor: isOpen ? 'pointer' : 'not-allowed',
              background: isOpen ? '#185FA5' : '#F1EFE8',
              color: isOpen ? '#fff' : '#B4B2A9',
              transition: 'all 0.18s'
            }}
          >
            Mark Attendance
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#B4B2A9', paddingBottom: '2rem' }}>
        Powered by Smart Attendance · Session auto-closes when timer ends
      </p>
    </main>
  )
}