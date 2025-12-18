# Anonymous City Chat (15+) — Free Publishing Edition (No accounts, Text-only, Beautiful UI)

This edition includes:
- Stunning UI (neon + minimal + luxury + gamer + Apple-clean)
- City-only matching (no exact location stored or shown)
- Age+gender required, filters (age range + preferred gender)
- Teen/adult separation (15–17 vs 18+)
- Text-only chat (no images/files)
- Block + Report + Next chat
- "Searching / waking server" screen + smart retry
- Optional free analytics (Google Analytics) — enabled only if you add an ID
- Built-in legal pages: Terms, Privacy, Safety Notice

## Free hosting (no money)
Recommended free stack:
- Frontend: Vercel (free)
- Backend: Render (free)
- Database: Neon Postgres (free)

---

## Local run (optional)
### 1) Postgres (Docker)
```bash
docker compose up -d
```

### 2) Server
```bash
cd server
cp .env.example .env
npm i
npm run dev
```

### 3) Web
```bash
cd ../web
cp .env.local.example .env.local
npm i
npm run dev
```

---

## Publish for $0 (Step-by-step)
### A) Database: Neon (free)
Create a Neon project and copy your `DATABASE_URL`.

### B) Backend: Render (free)
Create a Render "Web Service" from your GitHub repo:
- Root directory: `server`
- Build: `npm install`
- Start: `npm start`
Env vars:
- `DATABASE_URL` = Neon connection string
- `CORS_ORIGIN` = your Vercel URL (after you deploy web)
- `NOMINATIM_UA` = a descriptive UA with your contact email
- `PORT` = 4000 (optional; Render sets its own PORT too)

### C) Frontend: Vercel (free)
Import GitHub repo to Vercel:
- Root directory: `web`
Env vars:
- `NEXT_PUBLIC_SERVER_URL` = Render backend URL (https://...onrender.com)
Optional:
- `NEXT_PUBLIC_GA_ID` = Google Analytics Measurement ID (G-XXXXXXX)

### D) Prevent sleep as much as possible (free)
Render free services can sleep when inactive.
To reduce sleep:
- Add a free uptime monitor (e.g., UptimeRobot free plan) to ping:
  - `https://YOUR_BACKEND/health` every 5 minutes
  - `https://YOUR_SITE/` every 5 minutes

---

## Routes
- `/` Home + filters + find match
- `/chat` Chat UI
- `/legal/terms`
- `/legal/privacy`
- `/legal/safety`

> Not legal advice. These are starter docs you should review.
