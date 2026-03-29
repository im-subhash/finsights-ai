# FinSights AI Deployment Guide

This guide deploys:
- Backend (`apps/backend`) on Render
- Frontend (`apps/frontend`) on Netlify

It also includes a strict live verification checklist for CSV/PDF upload and AI insights.

## 1) Pre-deploy cleanup (local)

From project root:

```bash
cd "/Users/subodhsingh/The FinSights"
```

Do not push local-only folders/files:
- `node_modules`
- `dist`
- `.env`
- `.DS_Store`

They are already covered in `.gitignore`.

## 2) Create repository

1. Create a new GitHub repo (example: `finsights-ai`).
2. From project root:

```bash
git init
git add .
git commit -m "Initial FinSights AI app"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 3) Deploy backend on Render

1. Open [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repo.
4. Configure:
   - **Root Directory**: `apps/backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables:
   - `PORT=4000`
   - `MONGODB_URI=<your atlas uri>`
   - `GEMINI_API_KEY=<your key>`
   - `CSV_MAX_FILE_SIZE_MB=10`
6. Deploy.
7. Note backend URL (example): `https://finsights-backend.onrender.com`
8. Test in browser:
   - `https://finsights-backend.onrender.com/health`
   - Expected: `{"status":"ok","service":"finsights-backend"}`

## 4) Deploy frontend on Netlify

1. Open [Netlify Dashboard](https://app.netlify.com/).
2. Click **Add new site** -> **Import an existing project**.
3. Connect same GitHub repo.
4. Configure:
   - **Base directory**: `apps/frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `apps/frontend/dist`
5. Add environment variable:
   - `VITE_API_BASE_URL=https://<your-render-backend-domain>`
6. Deploy site.
7. Open frontend URL and verify dashboard loads.

## 5) Post-deploy verification checklist (must pass)

Run these checks on live frontend:

1. Dashboard opens with no blank screen.
2. Upload a valid CSV under 10MB:
   - Insights appear
   - Hero, nudge, charts, and feed update
3. Upload a valid bank-statement PDF under 10MB:
   - Transactions parsed
   - Categories appear in spending breakdown
4. In **All feed**, confirm category chips show (including `Transfers`, `Banking`, `Others`, `Healthcare`, `Dining`).
5. Click any spending category:
   - AI nudge and focus metrics update
6. Open transaction detail:
   - Original `rawFields` are visible
7. Upload 0KB file:
   - Error: file is empty
8. Upload >10MB file:
   - Error: max 10MB

## 6) Production troubleshooting

- **Frontend says "Cannot connect to backend API"**
  - Verify `VITE_API_BASE_URL` in Netlify points to the correct Render backend URL.
  - Redeploy frontend after env update.

- **Backend health fails**
  - Check Render service logs.
  - Confirm env vars are set.

- **Mongo warning on Render**
  - Ensure Atlas IP access is open for Render (or use `0.0.0.0/0` during demo).

- **AI extraction not responding**
  - Recheck `GEMINI_API_KEY`.
  - If key is invalid, app still falls back to deterministic insights, but AI quality drops.

## 7) Demo-day flow (recommended)

1. Open deployed frontend URL.
2. Upload a known sample CSV (small, clean file).
3. Show category click -> nudge change.
4. Show All feed filters.
5. Upload a bank PDF.
6. Show how categories + trends update.

Keep one backup file each (CSV/PDF) locally for smooth demo execution.
