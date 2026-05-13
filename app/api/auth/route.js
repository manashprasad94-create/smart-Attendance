import { NextResponse } from 'next/server'

export async function POST(request) {
  const { password } = await request.json()
  const correct = process.env.ADMIN_PASSWORD

  if (password === correct) {
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ success: false }, { status: 401 })
}