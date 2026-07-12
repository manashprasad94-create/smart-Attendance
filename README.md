# Smart Attendance System

A lightweight, session-based attendance app for classrooms. The host (teacher/CR) opens a time-boxed session from an admin panel, students mark themselves present from their phones, and attendance is validated server-side using name/roll matching, device fingerprinting, and optional GPS geofencing — all without needing student accounts or a native app.

**Live demo:** [https://smart-attendance-chi-three.vercel.app/]

---

## Features

- **Timed sessions** — host starts a session (3/5/10/15 min), and it auto-closes when the timer runs out
- **One-tap marking** — students just enter their name and roll number, no login required
- **Duplicate prevention** — device fingerprinting (FingerprintJS) blocks one device from submitting attendance for multiple people in the same session
- **Geofencing (optional)** — host's location is captured when a session starts; students must be within a configurable radius (50–500m) to mark attendance, checked both client- and server-side
- **Live admin dashboard** — real-time list of present students (polling every few seconds), sorted by roll number
- **One-click export** — "Copy List" button generates a plain-text summary (subject, date, count, roll + name) ready to paste into WhatsApp/email
- **Session history** — review, expand, and delete past sessions
- **Password-protected admin panel** — simple shared-password gate for the host area

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) |
| Styling | Tailwind CSS v4, Google Fonts (Playfair Display, DM Sans) |
| Database | [Supabase](https://supabase.com/) (Postgres) |
| Device fingerprinting | [FingerprintJS](https://github.com/fingerprintjs/fingerprintjs) |
| Geolocation | Browser Geolocation API + Haversine distance calculation |
| Deployment | [Vercel](https://vercel.com/) |

---

## How It Works

1. **Host starts a session** from `/admin` — sets duration, toggles geofencing, and picks an allowed radius. The host's current GPS location is captured as the geofence center.
2. **Students visit the home page**, see a live countdown, and tap "Mark Attendance" while the session is open.
3. On `/mark`, students enter their **name and roll number**. If geofencing is on, their location is requested; a device fingerprint is generated in the background.
4. The request hits `/api/submit`, which:
   - Matches the name/roll against the `students` table (case-insensitive)
   - Rejects the submission if this **device** has already marked attendance for this session
   - Re-validates the distance from the host **server-side** (never trusts client-reported distance alone)
   - Inserts the attendance record with IP address and device ID for auditing
5. The **admin dashboard** polls for new attendance and updates the present-students list live. The host can close the session early or let it auto-expire.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project

### 1. Clone and install

```bash
git clone https://github.com/manashprasad94-create/smart-Attendance.git
cd smart-Attendance
npm install
```

### 2. Set up the database

In your Supabase project, create the following tables:

**`students`**
| column | type |
|---|---|
| id | uuid, primary key |
| name | text |
| roll_number | text |

**`sessions`**
| column | type |
|---|---|
| id | uuid, primary key |
| created_at | timestamptz, default now() |
| expires_at | timestamptz |
| duration_minutes | int |
| is_active | boolean |
| subject | text, nullable |
| host_lat | float8, nullable |
| host_lng | float8, nullable |
| geo_radius | int, nullable |
| geo_enabled | boolean |

**`attendance`**
| column | type |
|---|---|
| id | uuid, primary key |
| session_id | uuid, references sessions(id) |
| student_id | uuid, references students(id) |
| device_id | text |
| ip_address | text |
| submitted_at | timestamptz, default now() |

> Populate the `students` table with your class roster (name + roll number) before running sessions.

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ADMIN_PASSWORD=choose-a-password
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the student-facing page — and [http://localhost:3000/admin](http://localhost:3000/admin) for the host dashboard.

### 5. Deploy

Deploy directly to [Vercel](https://vercel.com/new) and add the same three environment variables in your project settings.

---

## Project Structure

```
app/
├── page.js              # Student home — live session status + countdown
├── mark/page.js          # Student attendance form
├── admin/
│   ├── page.js            # Host dashboard — start/close sessions, live attendance
│   └── history/page.js    # Past sessions, expandable, deletable
├── api/
│   ├── submit/route.js    # Validates and records attendance
│   └── auth/route.js      # Admin password check
lib/
├── supabase.js           # Supabase client
└── geofence.js           # Haversine distance + geofence check helper
```

---

## Notes / Limitations

- Admin auth is a simple shared-password check (via `ADMIN_PASSWORD`), not per-user accounts — fine for a single class/CR, not intended for multi-tenant use.
- Geofencing relies on browser geolocation accuracy, which can vary indoors.
- Device fingerprinting reduces proxy attendance but isn't foolproof against a determined user with multiple devices/browsers.

---

## Author

Made by **Manash** for IT1, 2024–2028.
