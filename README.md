# FinSights AI

FinSights AI is a hyper-personalized financial intelligence app that turns transaction SMS data into actionable advice.

## Project Structure

- `apps/frontend`: React mobile-first dashboard (Vite).
- `apps/backend`: Node.js + Express API with MongoDB models and AI/advisory modules.

## Phase Mapping

- **Phase 1 (Foundation & Architecture)**:
  - React app scaffold
  - Express API scaffold
  - MongoDB-ready transaction model
- **Phase 2 (Zero-Touch Ingestion & AI Processing)**:
  - Regex-based SMS parser
  - Gemini integration adapter
  - Metadata extraction chain with merchant disambiguation fallback
- **Phase 3 (Advisory Agent & UI Integration)**:
  - Goal-aware advice generation service
  - API endpoint for proactive nudges
- **Phase 4 (Future Expansion)**:
  - Voice, Account Aggregator sync, gamification (planned)

## Quick Start

### 1) Backend

```bash
cd apps/backend
npm install
cp .env.example .env
npm run dev
```

### 2) Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

## Backend Environment Variables

- `PORT`: API port (default `4000`)
- `MONGODB_URI`: MongoDB connection string
- `GEMINI_API_KEY`: Google Gemini API key for extraction
- `CSV_MAX_FILE_SIZE_MB`: Max upload size in MB (capped at `10`)

## Deployment

Follow the full production guide in `DEPLOYMENT.md`.

