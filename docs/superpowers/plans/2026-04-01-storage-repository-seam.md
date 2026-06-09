# Storage Repository Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a repository abstraction layer over Firebase so the storage backend can be swapped without touching application logic.

**Architecture:** Define four TypeScript interfaces (`ITranscriptionRepository`, `IAudioRepository`, `IJobRepository`, `ILyricsRepository`) and implement each against the existing Firebase service layer. A composition root wires the concrete implementation via an env var. No call sites outside `src/repositories/` are changed in this plan — that is Plan B. This plan is additive except for one small addition to `firestoreService.ts` (a `deleteTranscription` function that doesn't exist yet).

**Tech Stack:** TypeScript, Jest, existing Firebase service files (`src/services/firebase/`, `src/config/firebase.ts`)

---

## How the Switching Mechanism Works

It is important to understand that **Plan A alone does not enable switching backends**. The seam only becomes a real switch once all four plans are complete. Here is the full picture:

### The three-plan sequence

```
Plan A (this plan)
  └─ Define interfaces + Firebase implementations
  └─ Composition root reads STORAGE_BACKEND env var
  └─ Result: seam exists, but nothing uses it yet — all callers still import Firebase directly

Plan B
  └─ Migrate every caller to import { repositories } from '@/repositories'
     instead of importing firestoreService / firebaseStorageService etc. directly
  └─ Result: the entire app now routes storage calls through the seam
  └─ Switching STORAGE_BACKEND at this point would throw "Unknown backend: postgres"
     because only Firebase is implemented

Plan C
  └─ Implement all four Postgres repositories:
       PostgresTranscriptionRepository — analysis results as JSONB rows
       PostgresAudioRepository        — MP3 files as bytea columns
       PostgresJobRepository          — segmentation jobs as rows
       PostgresLyricsRepository       — lyrics/translations as JSONB rows
  └─ Add Postgres schema + migrations (one file, four tables)
  └─ Result: set STORAGE_BACKEND=postgres → everything goes to Postgres, no other services needed
```

### Audio storage: Postgres bytea

MP3 files are stored directly in a Postgres `bytea` column rather than in a separate object store (MinIO, S3, etc.). At typical song lengths (3–6 minutes), audio files are 3–15 MB each — well within what Postgres handles comfortably for bytea. This eliminates an entire service from the stack.

`IAudioRepository.storeAudio` returns a `storageKey` string. For the Postgres implementation that key is just the `videoId` — the audio is retrieved by querying the `audio_files` table. The interface stays identical; the key format is an implementation detail.

### What the runtime switch looks like after all three plans

```bash
# Firebase (current default)
STORAGE_BACKEND=firebase

# Self-hosted — Postgres only, nothing else required
STORAGE_BACKEND=postgres
DATABASE_URL=postgres://user:pass@db:5432/chordmini
```

The composition root in `src/repositories/index.ts` reads `STORAGE_BACKEND` at startup, constructs the right concrete implementations, and returns them through the `repositories` object. Every caller just calls `repositories.transcriptions.get(...)` — they never know which backend is active.

### Why caller migration (Plan B) is a separate plan

Today the app has ~12 files that call Firebase services directly, bypassing the seam entirely. Until those are migrated, the `repositories` object exists but is dead code. Plan B is the highest-risk plan (most files touched, most potential for subtle regressions) so it is deliberately isolated from Plan A (which is purely additive and safe) and from Plan C (which adds new code rather than rewriting existing code).

### The safe rollback path

At any point after Plan B, you can switch back to Firebase by setting `STORAGE_BACKEND=firebase`. The Firebase implementations remain in the codebase permanently alongside the Postgres ones — they are not deleted after migration.

---

## Scope

This plan covers **interface definition + Firebase implementations only**.

Caller migration (files that import Firebase services directly) is **Plan B**.
The Postgres backend (all four repositories, including audio as bytea) is **Plan C**.

---

## File Map

### Created
| File | Responsibility |
|------|---------------|
| `src/repositories/ITranscriptionRepository.ts` | Interface for analysis result storage; re-exports `TranscriptionData` from firestoreService |
| `src/repositories/IAudioRepository.ts` | Interface + types for audio file metadata and binary storage |
| `src/repositories/IJobRepository.ts` | Interface + types for segmentation job lifecycle |
| `src/repositories/ILyricsRepository.ts` | Interface + types for lyrics and translation cache |
| `src/repositories/firebase/FirebaseTranscriptionRepository.ts` | Delegates to `getTranscription` / `saveTranscription` / new `deleteTranscription` |
| `src/repositories/firebase/FirebaseAudioRepository.ts` | Delegates to `firebaseStorageSimplified` singleton (metadata) + `uploadAudioFile` (binary) |
| `src/repositories/firebase/FirebaseJobRepository.ts` | Delegates to `segmentationJobService` functions |
| `src/repositories/firebase/FirebaseLyricsRepository.ts` | Extracts the Firestore get/set calls from the lyrics API routes |
| `src/repositories/index.ts` | Lazy composition root — exports getter functions, not module-load singletons |
| `tests/unit/repositories/transcriptionRepository.contract.test.ts` | Contract suite for `ITranscriptionRepository` |
| `tests/unit/repositories/audioRepository.contract.test.ts` | Contract suite for `IAudioRepository` |
| `tests/unit/repositories/jobRepository.contract.test.ts` | Contract suite for `IJobRepository` |
| `tests/unit/repositories/lyricsRepository.contract.test.ts` | Contract suite for `ILyricsRepository` |

### Modified (minimal)
| File | Change |
|------|--------|
| `src/services/firebase/firestoreService.ts` | Add `deleteTranscription(videoId, beatModel, chordModel)` — the only new function needed |

---

## Actual Firebase API signatures (verified from source)

Before implementing, know these real signatures:

```typescript
// firestoreService.ts
getTranscription(videoId, beatModel, chordModel): Promise<TranscriptionData | null>
saveTranscription(data: Omit<TranscriptionData, 'createdAt'>): Promise<boolean>
// TranscriptionData.createdAt is Firestore Timestamp — not a plain number

// firebaseStorageSimplified.ts  (singleton: firebaseStorageSimplified)
firebaseStorageSimplified.getCachedAudioMetadata(videoId): Promise<SimplifiedAudioData | null>
firebaseStorageSimplified.saveAudioMetadata(data: { videoId, audioUrl, ... }): Promise<void>
firebaseStorageSimplified.isAudioCached(videoId): Promise<boolean>

// firebaseStorageService.ts
uploadAudioFile(videoId, audioFile: File | Blob | ArrayBuffer, videoFile?): Promise<AudioUploadResult>
// Note: takes Blob/ArrayBuffer — Node Buffer must be converted to Blob before passing

// segmentationJobService.ts
// SongContext is in @/types/chatbotTypes — segmentationJobService re-uses but does not re-export it
createSegmentationJob(songContext: SongContext, audioUrl: string): Promise<{ jobId, updateToken, job }>
getSegmentationJob(jobId): Promise<SegmentationJobDocument | null>
updateSegmentationJob(jobId: string, updates: Partial<SegmentationJobDocument>): Promise<void>  // NO updateToken param
findActiveSegmentationJobByRequestHash(hash): Promise<SegmentationJobDocument | null>
findCompletedSegmentationJobByRequestHash(hash): Promise<SegmentationJobDocument | null>
cleanupStaleSegmentationJobs(): Promise<SegmentationJobCleanupResult>

// firebaseStorageSimplified.ts
saveAudioMetadata(data: { videoId, audioUrl, title: string, ... }): Promise<void>  // title is required
// uploadAudioFile returns Promise<{audioUrl, ...} | null> — always null-check the result
```

---

## Task 1: Define `ITranscriptionRepository`

**Files:**
- Create: `src/repositories/ITranscriptionRepository.ts`
- Create: `tests/unit/repositories/transcriptionRepository.contract.test.ts`

Re-export `TranscriptionData` from `firestoreService` rather than defining a parallel type. For `set()`, the caller passes `Omit<TranscriptionData, 'createdAt'>` — the backend is responsible for adding its own creation timestamp.

- [ ] **Step 1: Create the interface**

```typescript
// src/repositories/ITranscriptionRepository.ts

// Re-use the existing type to avoid drift. Backends that don't use Firestore Timestamp
// will ignore or convert `createdAt` — that mapping lives in each implementation.
export type { TranscriptionData } from '@/services/firebase/firestoreService';
import type { TranscriptionData } from '@/services/firebase/firestoreService';

export interface ITranscriptionRepository {
  /** Returns null on cache miss. */
  get(videoId: string, beatModel: string, chordModel: string): Promise<TranscriptionData | null>;

  /** Persists an analysis result. The backend sets its own createdAt. */
  set(data: Omit<TranscriptionData, 'createdAt'>): Promise<void>;

  /** Removes a cached result. No-op if not found. */
  delete(videoId: string, beatModel: string, chordModel: string): Promise<void>;
}
```

- [ ] **Step 2: Write contract tests (placeholder — Firebase tests need emulator)**

```typescript
// tests/unit/repositories/transcriptionRepository.contract.test.ts

import type { ITranscriptionRepository, TranscriptionData } from '@/repositories/ITranscriptionRepository';

const SAMPLE: Omit<TranscriptionData, 'createdAt'> = {
  videoId: 'testVideoId1',
  beatModel: 'madmom',
  chordModel: 'chordino',
  beats: [],
  chords: [],
  synchronizedChords: [],
  title: 'Test Video',
};

/**
 * Shared contract — any ITranscriptionRepository implementation must pass this.
 * Import and call this function in implementation-specific test files.
 */
export function runTranscriptionRepositoryContractTests(
  buildRepo: () => ITranscriptionRepository
) {
  let repo: ITranscriptionRepository;
  beforeEach(() => { repo = buildRepo(); });

  it('should_return_null_on_cache_miss', async () => {
    const result = await repo.get('missing', 'madmom', 'chordino');
    expect(result).toBeNull();
  });

  it('should_return_stored_data_after_set', async () => {
    await repo.set(SAMPLE);
    const result = await repo.get(SAMPLE.videoId, SAMPLE.beatModel, SAMPLE.chordModel);
    expect(result).not.toBeNull();
    expect(result!.videoId).toBe(SAMPLE.videoId);
  });

  it('should_treat_different_model_combinations_as_separate_entries', async () => {
    await repo.set(SAMPLE);
    const other = await repo.get(SAMPLE.videoId, 'essentia', 'chordino');
    expect(other).toBeNull();
  });

  it('should_return_null_after_delete', async () => {
    await repo.set(SAMPLE);
    await repo.delete(SAMPLE.videoId, SAMPLE.beatModel, SAMPLE.chordModel);
    const result = await repo.get(SAMPLE.videoId, SAMPLE.beatModel, SAMPLE.chordModel);
    expect(result).toBeNull();
  });
}

// Placeholder so the file is a valid test file now
describe('ITranscriptionRepository contract suite', () => {
  it('exports the contract runner function', () => {
    expect(typeof runTranscriptionRepositoryContractTests).toBe('function');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx jest tests/unit/repositories/transcriptionRepository.contract.test.ts --no-coverage | cat
```

Expected: 1 test passes.

- [ ] **Step 4: Commit**

```bash
git add src/repositories/ITranscriptionRepository.ts tests/unit/repositories/transcriptionRepository.contract.test.ts
git commit -m "Define ITranscriptionRepository interface and contract test suite"
```

---

## Task 2: Define `IAudioRepository`, `IJobRepository`, `ILyricsRepository`

**Files:**
- Create: `src/repositories/IAudioRepository.ts`
- Create: `src/repositories/IJobRepository.ts`
- Create: `src/repositories/ILyricsRepository.ts`
- Create: `tests/unit/repositories/audioRepository.contract.test.ts`
- Create: `tests/unit/repositories/jobRepository.contract.test.ts`

- [ ] **Step 1: Create `IAudioRepository`**

Types aligned to `SimplifiedAudioData` from `firebaseStorageSimplified.ts`. The `storeAudio` method takes `ArrayBuffer` — both `Buffer` (Node) and `Blob` callers can produce this. The Firebase impl converts to `Blob` before calling `uploadAudioFile`.

```typescript
// src/repositories/IAudioRepository.ts

// Reuse the existing metadata shape to avoid drift
export type { SimplifiedAudioData as AudioMetadata } from '@/services/firebase/firebaseStorageSimplified';
import type { SimplifiedAudioData as AudioMetadata } from '@/services/firebase/firebaseStorageSimplified';

export interface IAudioRepository {
  /** Returns cached metadata, or null on miss. */
  getMetadata(videoId: string): Promise<AudioMetadata | null>;

  /** Persists audio file metadata. `title` is required to match Firebase's saveAudioMetadata. */
  setMetadata(data: { videoId: string; audioUrl: string; title: string; [key: string]: unknown }): Promise<void>;

  /**
   * Upload raw audio bytes and return a storage URL.
   * Caller passes ArrayBuffer; backend handles format conversion.
   */
  storeAudio(videoId: string, data: ArrayBuffer, mimeType?: string): Promise<string>;

  /** Returns true if audio has been stored for this videoId. */
  audioExists(videoId: string): Promise<boolean>;
}
```

- [ ] **Step 2: Create `IJobRepository`**

The interface mirrors the real `segmentationJobService` signatures closely. This makes the Firebase impl a trivial delegation and defers the "clean abstraction" question to Plan C/D when a second backend exists to inform the design.

```typescript
// src/repositories/IJobRepository.ts

// SongContext lives in @/types/chatbotTypes — not re-exported from segmentationJobService
export type { SegmentationJobDocument as JobRecord, SegmentationJobStatus as JobStatus } from '@/services/firebase/segmentationJobService';
export type { SongContext } from '@/types/chatbotTypes';
import type { SongContext } from '@/types/chatbotTypes';
import type { SegmentationJobDocument } from '@/services/firebase/segmentationJobService';

export interface IJobRepository {
  /** Create a new job. Returns jobId and updateToken. */
  createJob(songContext: SongContext, audioUrl: string): Promise<{ jobId: string; updateToken: string }>;

  /** Fetch a job by ID. Returns null if not found. */
  getJob(jobId: string): Promise<SegmentationJobDocument | null>;

  /** Update job fields. Matches updateSegmentationJob(jobId, updates) signature — no updateToken. */
  updateJob(jobId: string, update: Partial<SegmentationJobDocument>): Promise<void>;

  /**
   * Find an existing job by request hash.
   * Searches both active and completed jobs; returns the most relevant match.
   */
  findJobByHash(requestHash: string): Promise<SegmentationJobDocument | null>;

  /** Delete stale jobs. Returns count of deleted jobs. */
  cleanupStaleJobs(): Promise<number>;
}
```

- [ ] **Step 3: Create `ILyricsRepository`**

Note: translations in the real app are keyed by a content hash (`cacheKey`), not by `videoId + language` alone. The interface uses `cacheKey` explicitly to avoid hiding that detail.

```typescript
// src/repositories/ILyricsRepository.ts

export interface LyricsData {
  videoId: string;
  lyrics?: string;
  syncedLyrics?: unknown[];
  source?: string;
  [key: string]: unknown;
}

export interface TranslationData {
  videoId?: string;
  language: string;
  translatedText?: string;
  [key: string]: unknown;
}

export interface ILyricsRepository {
  getLyrics(videoId: string): Promise<LyricsData | null>;
  setLyrics(videoId: string, data: LyricsData): Promise<void>;

  /** cacheKey is an opaque string; callers generate it (e.g. hash of content + language). */
  getTranslation(cacheKey: string): Promise<TranslationData | null>;
  setTranslation(cacheKey: string, data: TranslationData & { videoId: string }): Promise<void>;
}
```

- [ ] **Step 4: Write `IAudioRepository` contract tests**

```typescript
// tests/unit/repositories/audioRepository.contract.test.ts

import type { IAudioRepository } from '@/repositories/IAudioRepository';

export function runAudioRepositoryContractTests(buildRepo: () => IAudioRepository) {
  let repo: IAudioRepository;
  beforeEach(() => { repo = buildRepo(); });

  it('should_return_null_when_metadata_not_found', async () => {
    expect(await repo.getMetadata('notfound')).toBeNull();
  });

  it('should_return_metadata_after_setMetadata', async () => {
    await repo.setMetadata({ videoId: 'abc123', audioUrl: 'https://example.com/a.mp3' });
    const result = await repo.getMetadata('abc123');
    expect(result).not.toBeNull();
    expect(result!.videoId).toBe('abc123');
  });

  it('should_report_audio_does_not_exist_when_missing', async () => {
    expect(await repo.audioExists('notfound')).toBe(false);
  });
}

describe('IAudioRepository contract suite', () => {
  it('exports the contract runner function', () => {
    expect(typeof runAudioRepositoryContractTests).toBe('function');
  });
});
```

- [ ] **Step 5: Write `IJobRepository` contract tests**

```typescript
// tests/unit/repositories/jobRepository.contract.test.ts

import type { IJobRepository } from '@/repositories/IJobRepository';
import type { SongContext } from '@/types/chatbotTypes';

const SONG_CONTEXT: SongContext = {
  videoId: 'testVideoId1',
  title: 'Test Song',
  uploadId: undefined,
};

export function runJobRepositoryContractTests(buildRepo: () => IJobRepository) {
  let repo: IJobRepository;
  beforeEach(() => { repo = buildRepo(); });

  it('should_return_null_when_job_not_found', async () => {
    expect(await repo.getJob('no-such-job')).toBeNull();
  });

  it('should_return_job_after_createJob', async () => {
    const { jobId } = await repo.createJob(SONG_CONTEXT, 'https://example.com/audio.mp3');
    const result = await repo.getJob(jobId);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('created');
    expect(result!.videoId).toBe(SONG_CONTEXT.videoId);
  });

  it('should_return_null_when_hash_not_found', async () => {
    expect(await repo.findJobByHash('no-such-hash')).toBeNull();
  });
}

describe('IJobRepository contract suite', () => {
  it('exports the contract runner function', () => {
    expect(typeof runJobRepositoryContractTests).toBe('function');
  });
});
```

- [ ] **Step 6: Write `ILyricsRepository` contract tests**

```typescript
// tests/unit/repositories/lyricsRepository.contract.test.ts

import type { ILyricsRepository, LyricsData } from '@/repositories/ILyricsRepository';

export function runLyricsRepositoryContractTests(buildRepo: () => ILyricsRepository) {
  let repo: ILyricsRepository;
  beforeEach(() => { repo = buildRepo(); });

  it('should_return_null_when_lyrics_not_found', async () => {
    expect(await repo.getLyrics('notfound')).toBeNull();
  });

  it('should_return_lyrics_after_setLyrics', async () => {
    const data: LyricsData = { videoId: 'abc123', lyrics: 'Hello world' };
    await repo.setLyrics('abc123', data);
    const result = await repo.getLyrics('abc123');
    expect(result).not.toBeNull();
    expect(result!.lyrics).toBe('Hello world');
  });

  it('should_return_null_when_translation_not_found', async () => {
    expect(await repo.getTranslation('no-such-key')).toBeNull();
  });

  it('should_return_translation_after_setTranslation', async () => {
    const data = { videoId: 'abc123', language: 'es', translatedText: 'Hola mundo' };
    await repo.setTranslation('cache-key-es-abc', data);
    const result = await repo.getTranslation('cache-key-es-abc');
    expect(result).not.toBeNull();
    expect(result!.language).toBe('es');
  });
}

describe('ILyricsRepository contract suite', () => {
  it('exports the contract runner function', () => {
    expect(typeof runLyricsRepositoryContractTests).toBe('function');
  });
});
```

- [ ] **Step 7: Run all contract placeholder tests**

```bash
npx jest tests/unit/repositories/ --no-coverage | cat
```

Expected: 4 tests pass (all placeholders).

- [ ] **Step 8: Commit**

```bash
git add src/repositories/IAudioRepository.ts src/repositories/IJobRepository.ts src/repositories/ILyricsRepository.ts tests/unit/repositories/audioRepository.contract.test.ts tests/unit/repositories/jobRepository.contract.test.ts tests/unit/repositories/lyricsRepository.contract.test.ts
git commit -m "Define IAudioRepository, IJobRepository, ILyricsRepository and contract test suites"
```

> **On Firebase contract tests in CI:** The contract runner functions (`runAudioRepositoryContractTests`, etc.) require live Firebase services to produce meaningful results. Do **not** invoke them with a `FirebaseXxxRepository` instance in the unit test files — save that for integration tests. In unit test files, mock the Firebase implementations:
> ```typescript
> jest.mock('@/repositories/firebase/FirebaseTranscriptionRepository');
> ```
> The placeholder `describe` blocks in each contract test file are valid unit tests on their own. Firebase integration testing is deferred to a later plan.

---

## Task 3: Add `deleteTranscription` to `firestoreService.ts`

**Files:**
- Modify: `src/services/firebase/firestoreService.ts`

The delete operation is needed by `ITranscriptionRepository` but doesn't exist yet. Add it at the end of the file following the same guard pattern as `saveTranscription`.

- [ ] **Step 1: Write a failing test**

```typescript
// Add to tests/unit/repositories/transcriptionRepository.contract.test.ts:

describe('firestoreService exports deleteTranscription', () => {
  it('should_export_deleteTranscription_as_a_function', async () => {
    const { deleteTranscription } = await import('@/services/firebase/firestoreService');
    expect(typeof deleteTranscription).toBe('function');
  });
});
```

Run:
```bash
npx jest tests/unit/repositories/transcriptionRepository.contract.test.ts --no-coverage | cat
```

Expected: FAIL — "deleteTranscription is not a function" (or export error).

- [ ] **Step 2: Add `deleteTranscription` to `firestoreService.ts`**

Open `src/services/firebase/firestoreService.ts` and add after `updateTranscriptionEnrichment`:

```typescript
export async function deleteTranscription(
  videoId: string,
  beatModel: string,
  chordModel: string
): Promise<boolean> {
  if (!db || firestoreDisabled) {
    return false;
  }
  try {
    const docId = buildTranscriptionDocId(videoId, beatModel, chordModel);
    const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting transcription from Firestore:', error);
    return false;
  }
}
```

Also add `deleteDoc` to the `firebase/firestore` import at the top of the file.

- [ ] **Step 3: Run the test**

```bash
npx jest tests/unit/repositories/transcriptionRepository.contract.test.ts --no-coverage | cat
```

Expected: PASS.

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit | cat
```

- [ ] **Step 5: Commit**

```bash
git add src/services/firebase/firestoreService.ts tests/unit/repositories/transcriptionRepository.contract.test.ts
git commit -m "Add deleteTranscription to firestoreService"
```

---

## Task 4: Implement `FirebaseTranscriptionRepository`

**Files:**
- Create: `src/repositories/firebase/FirebaseTranscriptionRepository.ts`

- [ ] **Step 1: Implement**

```typescript
// src/repositories/firebase/FirebaseTranscriptionRepository.ts

import type { ITranscriptionRepository, TranscriptionData } from '@/repositories/ITranscriptionRepository';
import {
  getTranscription,
  saveTranscription,
  deleteTranscription,
} from '@/services/firebase/firestoreService';

export class FirebaseTranscriptionRepository implements ITranscriptionRepository {
  async get(videoId: string, beatModel: string, chordModel: string): Promise<TranscriptionData | null> {
    return getTranscription(videoId, beatModel, chordModel);
  }

  async set(data: Omit<TranscriptionData, 'createdAt'>): Promise<void> {
    await saveTranscription(data);
  }

  async delete(videoId: string, beatModel: string, chordModel: string): Promise<void> {
    await deleteTranscription(videoId, beatModel, chordModel);
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit | cat
```

- [ ] **Step 3: Commit**

```bash
git add src/repositories/firebase/FirebaseTranscriptionRepository.ts
git commit -m "Implement FirebaseTranscriptionRepository"
```

---

## Task 5: Implement `FirebaseAudioRepository`

**Files:**
- Create: `src/repositories/firebase/FirebaseAudioRepository.ts`

`storeAudio` takes `ArrayBuffer`. Firebase's `uploadAudioFile` accepts `Blob | ArrayBuffer`, so no conversion is needed for `ArrayBuffer` input. Node `Buffer` callers can pass `.buffer` to get the underlying `ArrayBuffer`.

- [ ] **Step 1: Implement**

```typescript
// src/repositories/firebase/FirebaseAudioRepository.ts

import type { IAudioRepository, AudioMetadata } from '@/repositories/IAudioRepository';
import { firebaseStorageSimplified } from '@/services/firebase/firebaseStorageSimplified';
import { uploadAudioFile } from '@/services/firebase/firebaseStorageService';

export class FirebaseAudioRepository implements IAudioRepository {
  async getMetadata(videoId: string): Promise<AudioMetadata | null> {
    return firebaseStorageSimplified.getCachedAudioMetadata(videoId);
  }

  async setMetadata(data: { videoId: string; audioUrl: string; title: string; [key: string]: unknown }): Promise<void> {
    await firebaseStorageSimplified.saveAudioMetadata(data as Parameters<typeof firebaseStorageSimplified.saveAudioMetadata>[0]);
  }

  async storeAudio(videoId: string, data: ArrayBuffer, mimeType = 'audio/mpeg'): Promise<string> {
    const result = await uploadAudioFile(videoId, data);
    if (!result) throw new Error(`uploadAudioFile returned null for videoId: ${videoId}`);
    return result.audioUrl;
  }

  async audioExists(videoId: string): Promise<boolean> {
    return firebaseStorageSimplified.isAudioCached(videoId);
  }
}
```

> **Note:** Read `uploadAudioFile`'s return type in `firebaseStorageService.ts` to confirm the field name (`audioUrl` or similar). Adjust if needed.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit | cat
```

- [ ] **Step 3: Commit**

```bash
git add src/repositories/firebase/FirebaseAudioRepository.ts
git commit -m "Implement FirebaseAudioRepository"
```

---

## Task 6: Implement `FirebaseJobRepository` and `FirebaseLyricsRepository`

**Files:**
- Create: `src/repositories/firebase/FirebaseJobRepository.ts`
- Create: `src/repositories/firebase/FirebaseLyricsRepository.ts`

- [ ] **Step 1: Read source files**

```bash
grep -n "export async function" src/services/firebase/segmentationJobService.ts | cat
grep -n "cacheKey\|TRANSLATIONS\|lyrics\|setDoc\|getDoc" src/app/api/translate-lyrics/route.ts | head -20 | cat
grep -n "setDoc\|getDoc\|lyrics\|collection" src/app/api/transcribe-lyrics/route.ts | head -20 | cat
```

- [ ] **Step 2: Implement `FirebaseJobRepository`**

```typescript
// src/repositories/firebase/FirebaseJobRepository.ts

import type { IJobRepository } from '@/repositories/IJobRepository';
import type { SongContext, SegmentationJobDocument } from '@/services/firebase/segmentationJobService';
import {
  createSegmentationJob,
  getSegmentationJob,
  updateSegmentationJob,
  findActiveSegmentationJobByRequestHash,
  findCompletedSegmentationJobByRequestHash,
  cleanupStaleSegmentationJobs,
} from '@/services/firebase/segmentationJobService';

export class FirebaseJobRepository implements IJobRepository {
  async createJob(songContext: SongContext, audioUrl: string): Promise<{ jobId: string; updateToken: string }> {
    const { jobId, updateToken } = await createSegmentationJob(songContext, audioUrl);
    return { jobId, updateToken };
  }

  async getJob(jobId: string): Promise<SegmentationJobDocument | null> {
    return getSegmentationJob(jobId);
  }

  async updateJob(jobId: string, update: Partial<SegmentationJobDocument>): Promise<void> {
    return updateSegmentationJob(jobId, update);
  }

  async findJobByHash(requestHash: string): Promise<SegmentationJobDocument | null> {
    // Check active jobs first (more likely to be relevant), then completed
    return (
      await findActiveSegmentationJobByRequestHash(requestHash) ??
      await findCompletedSegmentationJobByRequestHash(requestHash)
    );
  }

  async cleanupStaleJobs(): Promise<number> {
    const result = await cleanupStaleSegmentationJobs();
    return result.deletedCount ?? 0;
  }
}
```

> **Note:** Read the `SegmentationJobCleanupResult` type to confirm the field name for deleted count.

- [ ] **Step 3: Implement `FirebaseLyricsRepository`**

Read the translation route to find exactly how `cacheKey` is built and which Firestore collection/fields are used. Extract those operations verbatim.

```typescript
// src/repositories/firebase/FirebaseLyricsRepository.ts
// Skeleton — fill in exact collection names and field shapes from the route files.

import type { ILyricsRepository, LyricsData, TranslationData } from '@/repositories/ILyricsRepository';
import { TRANSLATIONS_COLLECTION } from '@/config/firebase';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseApp } from '@/services/firebase/firebaseService';

// Use getFirestore(firebaseApp) consistently — avoids the nullable `db` from config
// and matches the pattern used in transcribe-lyrics/route.ts.

export class FirebaseLyricsRepository implements ILyricsRepository {
  private getDb() {
    return getFirestore(firebaseApp);
  }

  async getLyrics(videoId: string): Promise<LyricsData | null> {
    const docRef = doc(this.getDb(), 'lyrics', videoId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as LyricsData) : null;
  }

  async setLyrics(videoId: string, data: LyricsData): Promise<void> {
    const docRef = doc(this.getDb(), 'lyrics', videoId);
    await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
  }

  async getTranslation(cacheKey: string): Promise<TranslationData | null> {
    const docRef = doc(this.getDb(), TRANSLATIONS_COLLECTION, cacheKey);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as TranslationData) : null;
  }

  async setTranslation(cacheKey: string, data: TranslationData & { videoId: string }): Promise<void> {
    const docRef = doc(this.getDb(), TRANSLATIONS_COLLECTION, cacheKey);
    await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
  }
}
```

> **Verify:** Check that `TRANSLATIONS_COLLECTION` is exported from `@/config/firebase` and that the `lyrics` collection name matches `transcribe-lyrics/route.ts` before finalising.

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit | cat
```

- [ ] **Step 5: Commit**

```bash
git add src/repositories/firebase/FirebaseJobRepository.ts src/repositories/firebase/FirebaseLyricsRepository.ts
git commit -m "Implement FirebaseJobRepository and FirebaseLyricsRepository"
```

---

## Task 7: Create the Composition Root

**Files:**
- Create: `src/repositories/index.ts`

Use lazy getter functions rather than module-level singleton construction to avoid side-effect imports when the module is required in tests or non-Firebase environments.

- [ ] **Step 1: Create the composition root**

```typescript
// src/repositories/index.ts

import type { ITranscriptionRepository } from './ITranscriptionRepository';
import type { IAudioRepository } from './IAudioRepository';
import type { IJobRepository } from './IJobRepository';
import type { ILyricsRepository } from './ILyricsRepository';

type Backend = 'firebase';
const backend = (process.env.STORAGE_BACKEND ?? 'firebase') as Backend;

function createBackend() {
  if (backend === 'firebase') {
    // Dynamic imports keep Firebase SDK out of module-load scope for non-Firebase envs
    const { FirebaseTranscriptionRepository } = require('./firebase/FirebaseTranscriptionRepository');
    const { FirebaseAudioRepository } = require('./firebase/FirebaseAudioRepository');
    const { FirebaseJobRepository } = require('./firebase/FirebaseJobRepository');
    const { FirebaseLyricsRepository } = require('./firebase/FirebaseLyricsRepository');
    return {
      transcriptions: new FirebaseTranscriptionRepository() as ITranscriptionRepository,
      audio: new FirebaseAudioRepository() as IAudioRepository,
      jobs: new FirebaseJobRepository() as IJobRepository,
      lyrics: new FirebaseLyricsRepository() as ILyricsRepository,
    };
  }
  throw new Error(`Unknown STORAGE_BACKEND: "${backend}". Valid values: firebase`);
}

// Lazily created once on first access
let _repos: ReturnType<typeof createBackend> | null = null;
function getRepos() {
  if (!_repos) _repos = createBackend();
  return _repos;
}

export const repositories = {
  get transcriptions(): ITranscriptionRepository { return getRepos().transcriptions; },
  get audio(): IAudioRepository { return getRepos().audio; },
  get jobs(): IJobRepository { return getRepos().jobs; },
  get lyrics(): ILyricsRepository { return getRepos().lyrics; },
};

/**
 * Test helper — reset the repository singleton (use in beforeEach with jest.resetModules()).
 * Not exported from the public API, only for test use.
 */
export function _resetRepositoriesForTesting() {
  _repos = null;
}
```

> **Test isolation:** In unit tests that import from `@/repositories`, either:
> - `jest.mock('@/repositories', () => ({ repositories: { transcriptions: mockRepo, ... } }))`, or
> - Call `_resetRepositoriesForTesting()` in `beforeEach` and set `process.env.STORAGE_BACKEND` as needed.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit | cat
```

- [ ] **Step 3: Run all unit tests**

```bash
npx jest tests/unit/ --no-coverage | cat
```

Expected: all pass — no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/repositories/index.ts
git commit -m "Add lazy repository composition root wired to Firebase backend"
```

---

## Definition of Done

- [ ] Four interface files exist in `src/repositories/`
- [ ] Four Firebase implementations exist in `src/repositories/firebase/`
- [ ] `src/repositories/index.ts` exports `repositories` with lazy getter pattern
- [ ] `deleteTranscription` added to `src/services/firebase/firestoreService.ts`
- [ ] `npx tsc --noEmit` exits clean
- [ ] Four contract test files exist in `tests/unit/repositories/`
- [ ] `npx jest tests/unit/ --no-coverage` passes
- [ ] **No call sites changed** — all callers still import Firebase services directly (Plan B migrates them)

---

## What Plan B Will Do

Plan B migrates every caller to `import { repositories } from '@/repositories'`. Key files:

- `src/hooks/analyze/useAnalyzePageOrchestrator.ts`
- `src/services/cache/smartFirebaseCache.ts`
- `src/services/audio/audioProcessingService.ts`
- `src/services/audio/audioExtractionSimplified.ts`
- `src/services/audio/audioProcessingExtracted.ts`
- `src/services/audio/beatDetectionService.ts`
- `src/app/api/segmentation/jobs/route.ts`
- `src/app/api/segmentation/jobs/[jobId]/route.ts`
- `src/app/api/cron/cleanup-segmentation-jobs/route.ts`
- `src/app/api/translate-lyrics/route.ts`
- `src/app/api/translate-lyrics-cached/route.ts`
- `src/app/api/transcribe-lyrics/route.ts`
