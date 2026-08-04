# KALIFE 2026 Sports Day Manager

Complete web application for managing inter-district sports day fixtures, live scores, standings, and overall championship log.

## Features

- **Dashboard** — Live stats, medal tally, next matches, current phase
- **Fixtures** — Full schedule with filtering by sport
- **Live Scores** — Real-time score entry with auto-save
- **Standings** — Per-sport tables (Basketball, Volleyball, Soccer, Tug of War, Athletics)
- **Log Standings** — Overall championship across all sports
- **District Schedules** — Personal fixture list per district
- **Fixture Generator** — Auto-generate round-robin schedules from team names, dates, and duration
- **Excel Upload** — Bulk import fixtures from .xlsx files
- **Dark Mode** — Automatic system preference detection
- **Real-time** — Socket.io ready for live updates

## Quick Start

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Set up database
```bash
cd server
cp .env.example .env
# Edit .env with your DATABASE_URL
npx prisma migrate dev --name init
npm run seed
```

### 3. Start development
```bash
cd ..
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Fixture Generator

Navigate to the **Generate** tab to auto-create schedules:

1. Enter team codes (comma-separated): `ZAM, BAR, HAL, SHA, TEH, TOW`
2. Select sport, start date/time, match duration
3. Choose format: Single Round-Robin, Double Round-Robin, or Group Stage
4. Enter venues (comma-separated)
5. Set how many matches run simultaneously
6. Click **Preview Schedule** to see the generated table
7. Click **Save to Database** to store fixtures permanently

### Supported Formats

| Format | Description | Matches (6 teams) |
|--------|-------------|-------------------|
| Single Round-Robin | Each pair plays once | 15 |
| Double Round-Robin | Each pair plays twice | 30 |
| Group Stage | Teams split into groups | Varies |

## Excel Upload Format

Upload a `.xlsx` file with these columns:

| time | round | venue | sport | team_a | team_b | scheduled_at |
|------|-------|-------|-------|--------|--------|--------------|
| 09:48-09:58 | R1 | BB Court | Basketball | ZAM | TOW | 2026-08-01T09:48:00 |

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Real-time:** Socket.io
- **Excel:** xlsx (SheetJS)

## Project Structure

```
kalife-starter/
├── client/          # React frontend
├── server/          # Express backend
│   ├── lib/
│   │   └── scheduler.js   # Round-robin generation algorithm
│   └── routes/
│       ├── generate.js    # Fixture generation API
│       └── upload.js      # Excel import API
└── package.json
```
