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
    <main style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#F7F4EF',
      minHeight: '100vh',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F4EF; }
        @media (max-width: 480px) {
          .hero-title { font-size: 32px !important; }
          .hero-sub { font-size: 14px !important; }
          .timer-big { font-size: 48px !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderBottom: '0.5px solid #E8E5DF'
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#5F5E5A'
        }}>
          Attendance Portal
        </span>
        <button
          onClick={() => router.push('/admin')}
          style={{
            background: '#fff',
            border: '0.5px solid #D3D1C7',
            borderRadius: 20,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 500,
            color: '#5F5E5A',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            minHeight: 32
          }}
        >
          Admin
        </button>
      </nav>

      {/* Main content — centered and grows to fill screen */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
        textAlign: 'center'
      }}>

        {/* Status pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: '#fff',
          border: '0.5px solid #D3D1C7',
          borderRadius: 20,
          padding: '6px 16px',
          fontSize: 12,
          color: '#5F5E5A',
          marginBottom: '1.5rem'
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isOpen ? '#639922' : '#D3D1C7',
            display: 'inline-block'
          }} />
          {isOpen ? 'Session is live' : 'No active session'}
        </div>

        {/* Title */}
        <h1
          className="hero-title"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 38,
            fontWeight: 700,
            color: '#2C2C2A',
            lineHeight: 1.2,
            marginBottom: '0.75rem'
          }}
        >
          Smart{' '}
          <span style={{ color: '#185FA5' }}>Attendance</span>
          {' '}System
        </h1>

        <p
          className="hero-sub"
          style={{
            fontSize: 15,
            color: '#888780',
            lineHeight: 1.7,
            marginBottom: '2.5rem',
            maxWidth: 320
          }}
        >
          Mark your attendance before the session closes.
        </p>

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: 24,
          border: '0.5px solid #D3D1C7',
          padding: '1.75rem 1.5rem',
          width: '100%',
          maxWidth: 400,
        }}>

          {/* Status row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <span style={{
              fontSize: 11,
              color: '#888780',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>
              Session Status
            </span>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500,
              color: isOpen ? '#3B6D11' : '#A32D2D'
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isOpen ? '#639922' : '#D3D1C7'
              }} />
              {isOpen ? 'Live' : 'Closed'}
            </span>
          </div>

          {/* Timer */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: '0.5rem'
          }}>
            <span
              className="timer-big"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 52,
                fontWeight: 700,
                color: isOpen ? '#2C2C2A' : '#D3D1C7',
                lineHeight: 1
              }}
            >
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: 13, color: '#888780' }}>remaining</span>
          </div>

          {/* Session time info */}
          <p style={{
            fontSize: 12,
            color: '#B4B2A9',
            marginBottom: '1.75rem',
            lineHeight: 1.6
          }}>
            {session
              ? `Opens ${new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Closes ${new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Waiting for host to open session...'}
          </p>

          {/* CTA Button — large tap target */}
          <button
            onClick={() => isOpen && router.push('/mark')}
            disabled={!isOpen}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 14,
              border: 'none',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 500,
              cursor: isOpen ? 'pointer' : 'not-allowed',
              background: isOpen ? '#185FA5' : '#F1EFE8',
              color: isOpen ? '#fff' : '#B4B2A9',
              transition: 'all 0.18s',
              minHeight: 52,
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {isOpen ? 'Mark Attendance →' : 'Session Not Open'}
          </button>
        </div>
      </div>

      <p style={{
        textAlign: 'center',
        fontSize: 11,
        color: '#B4B2A9',
        padding: '1rem',
        paddingBottom: '1.5rem'
      }}>
        Session auto-closes when timer ends
      </p>
      <div
  style={{
    textAlign: 'center',
    padding: '1.5rem 1rem',
    fontSize: 15,
    color: '#A8A59D',
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: 1.6
  }}
>
  Made without ❤️ by Manash for IT1_2024-2028
</div>
    </main>
    
  )
}