import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDistanceMeters } from '@/lib/geofence'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { name, roll, sessionId, studentLat, studentLng } = await request.json()

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown'

    // Step 1 — validate student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .ilike('name', name.trim())
      .eq('roll_number', roll.trim())
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Name and roll number do not match our records.' },
        { status: 400 }
      )
    }

    // Step 2 — check duplicate student
    const { data: existingStudent } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', sessionId)
      .eq('student_id', student.id)
      .single()

    if (existingStudent) {
      return NextResponse.json(
        { error: 'You have already marked your attendance for this session.' },
        { status: 400 }
      )
    }

    // Step 3 — check duplicate IP
    const isSharedNetwork =
      ip === 'unknown' ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.')

    if (!isSharedNetwork) {
      const { data: existingIP } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', sessionId)
        .eq('ip_address', ip)
        .single()

      if (existingIP) {
        return NextResponse.json(
          { error: 'Attendance has already been submitted from your device.' },
          { status: 400 }
        )
      }
    }

    // Step 4 — geofencing check (reads from session, not env)
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('host_lat, host_lng, geo_radius, geo_enabled')
      .eq('id', sessionId)
      .single()

    if (sessionData?.geo_enabled && sessionData?.host_lat && sessionData?.host_lng) {
      if (!studentLat || !studentLng) {
        return NextResponse.json(
          { error: 'Location is required. Please allow location access and try again.' },
          { status: 400 }
        )
      }

      const distance = getDistanceMeters(
        studentLat,
        studentLng,
        sessionData.host_lat,
        sessionData.host_lng
      )

      if (distance > (sessionData.geo_radius || 100)) {
        return NextResponse.json(
          { error: `You are ${Math.round(distance)}m away. Must be within ${sessionData.geo_radius || 100}m.` },
          { status: 400 }
        )
      }
    }

    // Step 5 — insert
    const { error: insertError } = await supabase
      .from('attendance')
      .insert({
        session_id: sessionId,
        student_id: student.id,
        ip_address: ip
      })

    if (insertError) {
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, name: student.name })

  } catch {
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 }
    )
  }
}