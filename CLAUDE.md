# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

ChordMini is a music analysis web app. Users input a YouTube URL or upload audio; the app performs beat detection and chord recognition via a Python ML backend, then displays results as a synchronized beat/chord grid with guitar diagrams, a piano roll visualizer, and AI-assisted lyrics.

## Commands

### Frontend (Next.js)
```bash
npm install          # Install dependencies
npm run dev          # Dev server on port 3000
npm run build        # Production build
npm run lint         # ESLint on src/
npm run test         # Run all Jest tests
npm run test:unit    # tests/unit only
npm run test:integration  # tests/integration only
npm run test:coverage     # Jest with coverage report
npx jest tests/unit/path/to/file.test.ts  # Run a single test file
```

### Python Backend
```bash
cd python_backend
python3 -m venv myenv       # Create virtualenv (first time only)
source myenv/bin/activate   # Activate virtualenv
pip install -r requirements.txt  # Install deps (first time only)
python app.py               # Dev server on port 5001
```

### SongFormer (optional song segmentation service)
Runs on port 8080 when active.

## Architecture

The project is a monorepo with three independently runnable services:

### Frontend (`src/`)
Next.js 16 (React 19) app with TypeScript, Tailwind CSS, and HeroUI components. State is managed with Zustand. Key pages:
- `src/app/page.tsx` — Homepage: YouTube search and URL input
- `src/app/analyze/[videoId]/page.tsx` — Main analysis view

Key services in `src/services/`:
- `audioAnalysisService` — Orchestrates the beat/chord pipeline; calls the Flask backend
- `chordPlaybackService` — MIDI synthesis via Tone.js + Smplr
- `lyricsService` — AI transcription and sync via Music.ai SDK and LRClib
- `cacheService` — Firebase Firestore/Storage caching layer to avoid re-processing

### Python Backend (`python_backend/`)
Flask 3 app using the factory pattern (`app_factory.py`). ML models loaded as git submodules under `python_backend/models/`:
- `Beat-Transformer` — Primary beat detection
- `Chord-CNN-LSTM` / `ChordMini` — Chord recognition models
- Madmom is also available as a beat detection fallback

Key API groups:
- `POST /api/detect-beats` — Beat detection (madmom or Beat-Transformer)
- `POST /api/recognize-chords` — Chord recognition (BTC or Chord-CNN-LSTM)
- `POST /api/audio-separation` — Spleeter 5-stem separation
- `GET /api/search-youtube` — YouTube search via yt-dlp

Audio is fetched from YouTube via `yt-dlp` and cached in Firebase Storage. Results are cached in Firestore keyed by video ID + model selection.

### External Dependencies
- **Firebase** — Auth, Firestore (results cache), Cloud Storage (audio cache)
- **Google Gemini API** — AI chat assistant on the analyze page
- **Genius / LRClib** — Lyrics sources
- **Music.ai SDK** — AI transcription (legacy/fallback)

## Key Architectural Patterns

**Caching strategy:** The frontend checks Firestore before calling the backend. Results are stored with a composite cache key (video ID + beat model + chord model). This means backend calls are rare for previously-analyzed songs.

**Model selection:** Users can switch between beat/chord models in the UI. Each combination is cached independently. The frontend passes model identifiers to backend API calls via query params or request body.

**Beat-chord alignment:** After receiving separate beat and chord arrays from the backend, the frontend aligns them with a heuristic (see `src/utils/` alignment utilities). This alignment logic is a frequent source of subtle bugs — commits reference it often.

**Audio pipeline:** YouTube audio → yt-dlp download → optional Spleeter separation → ML model inference → JSON results → Firestore cache. The frontend can also send a local file upload directly.

## Environment Variables

Copy `.env.example` to `.env.local` for the frontend. Key variables:
- `NEXT_PUBLIC_FIREBASE_*` — Firebase config
- `NEXT_PUBLIC_GEMINI_API_KEY` — Gemini AI
- `PYTHON_BACKEND_URL` — URL of Flask backend (default `http://localhost:5001`)
- `SONGFORMER_URL` — URL of SongFormer service (default `http://localhost:8080`)

The Python backend reads its own `.env` in `python_backend/`.

## Testing Structure

```
tests/
  unit/         # Jest unit tests (fast, isolated)
  integration/  # Jest integration tests
__tests__/      # Additional test files + Playwright config
```

Run Playwright E2E tests with `npm run test:e2e` (requires a running dev server).

## Task Management with Yaks

This project uses [`yx` (yaks)](https://github.com/mattwynne/yaks) — a shared, conflict-free TODO list for humans and AI agents.

The yak map is a tree of nested goals. Use it to discover, claim, and complete work:

```bash
yx ls                                  # Show the current work tree
yx ls --format json                    # Machine-readable output (preferred for agents)
yx add "Fix the thing"                 # Add a new yak
yx add "Sub-task" --under "Fix the thing"  # Nest under a parent
yx state "Fix the thing" wip           # Claim a yak before starting work
echo "notes" | yx field "Fix the thing" progress  # Store progress notes
yx done "Fix the thing"                # Mark complete
yx sync                                # Sync with teammates
```

**Agent workflow:** Before starting work, run `yx ls --format json` to discover what's planned. Mark a yak `wip` when you begin, update the `progress` field as you go, and mark it `done` when finished. Run `yx sync` after completing work.
