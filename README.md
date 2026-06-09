# ChordMiniApp — Fork

This is a personal fork of [ptnghia-j/ChordMiniApp](https://github.com/ptnghia-j/ChordMiniApp).

For setup instructions, architecture overview, API keys, and deployment, see the [upstream README](https://github.com/ptnghia-j/ChordMiniApp#readme).

## Why This Fork

Two personal needs the upstream app didn't cover:

**Self-hosting without Firebase.** The upstream app requires a Firebase project for every storage operation — Firestore for analysis results, Cloud Storage for audio blobs, Auth for session tokens. That's fine for a hosted product but is friction for running locally or on a private VPS. This fork introduces a repository abstraction layer so the entire storage backend can be swapped to Postgres with a single env var, making the app fully self-contained with just Docker Compose.

**Ukulele.** The upstream app only diagrams guitar chords. I play baritone ukulele and wanted standard ukulele (GCEA) diagrams so my daughter and I can play together, so this fork adds both tunings and a duo mode that shows them side by side.

---

## Running the App

### Docker + Postgres (no Firebase required)

This fork ships a Docker Compose dev stack that replaces Firebase with a local Postgres database.

1. Copy and fill the env file — only three keys are required:
   ```bash
   cp .env.docker.example .env.docker
   # Set GEMINI_API_KEY, NEXT_PUBLIC_YOUTUBE_API_KEY, GENIUS_API_KEY
   ```

2. Start everything (Postgres, Redis, Python backend, Next.js frontend):
   ```bash
   just up
   ```

3. Open [http://localhost:3000](http://localhost:3000).

```bash
just down      # stop services, keep database
just down -f   # stop and wipe all data
```

### Firebase (upstream default)

Follow the [upstream setup instructions](https://github.com/ptnghia-j/ChordMiniApp#readme). Set `STORAGE_BACKEND=firebase` (or omit it — `firebase` is the default) and supply the `NEXT_PUBLIC_FIREBASE_*` credentials in `.env.local`.

---

## What I Added

### Ukulele & Baritone Ukulele Support

- Standard ukulele chord diagrams in `GuitarChordDiagram` via a new `getUkuleleChordDataSync` path in `ChordMappingService`
- Baritone ukulele tuning variant
- **Duo mode** — renders guitar and ukulele diagrams side by side in `GuitarChordsTab` with a dropdown to switch instrument

### Storage Abstraction (Repository Pattern)

Introduced a repository seam so the app can run against Firebase or Postgres without changing call sites.

- `ITranscriptionRepository`, `IAudioRepository`, `IJobRepository`, `ILyricsRepository` interfaces with contract test suites
- `Firebase*Repository` implementations backed by the existing Firestore/Storage layer
- `Postgres*Repository` implementations backed by a `pg` connection pool and a schema migration in `src/db/`
- Lazy composition root in `src/repositories/index.ts` — switches on `DATABASE_URL` at runtime
- API routes (`/api/transcriptions`, `/api/audio/[videoId]`, etc.) so client code never imports server-only modules
- Docker Compose dev stack includes a Postgres service

### Dev Environment

- `devenv.nix` shell with Node, Python, and direnv integration (`.env.local` loaded automatically)
- `Justfile` with common commands (`just dev`, `just test`, `just backend`, etc.)
