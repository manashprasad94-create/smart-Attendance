import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDistanceMeters } from '@/lib/geofence'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { name, roll, sessionId, studentLat, studentLng, deviceId } = await request.json()
    console.log('Received deviceId:', deviceId)

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown'

    // Step 1 — validate student
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .ilike('name', name.trim().replace(/\s+/g, ' '))
        .ilike('roll_number', roll.trim())
        .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Name and roll number do not match our records.' },
        { status: 400 }
      )
    }

    // Step 2 — check duplicate student
const { data: existingDevice } = await supabase
  .from('attendance')
  .select('id')
  .eq('session_id', sessionId)
  .eq('device_id', deviceId)
  .limit(1)

if (existingDevice && existingDevice.length > 0) {
  return NextResponse.json(
    {
      error:
        'Attendance has already been submitted from this device for this session.'
    },
    { status: 400 }
  )
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
        ip_address: ip,
        device_id: deviceId
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