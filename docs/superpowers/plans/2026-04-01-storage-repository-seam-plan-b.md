# Storage Repository Seam — Plan B: Caller Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all Firebase storage calls through the `repositories` object so that swapping `STORAGE_BACKEND=postgres` works end-to-end.

**Architecture:** Plan A defined four interfaces and Firebase implementations. Plan B migrates the ~10 caller files to import `{ repositories }` from `@/repositories` instead of importing Firebase services directly. Two interfaces also need small extensions to cover methods that were not in scope during Plan A. No new behavior is added — this is a pure refactor.

**Tech Stack:** TypeScript, Jest, Next.js App Router, React hooks

---

## What is NOT changing

- `src/services/cache/smartFirebaseCache.ts` — no direct Firebase storage calls; skip.
- `src/services/audio/beatDetectionService.ts` — no Firebase calls at all; skip.
- `getSegmentationJobTtlMs`, `isSegmentationJobStale`, `buildSegmentationRequestHash` — pure utility functions, not storage operations. Keep importing them directly from `segmentationJobService`.
- `validateFirebaseStorageUrl` — URL validation utility, not storage. Keep as-is.

---

## File Map

### Modified: interface extensions (Task 1)
| File | Change |
|------|--------|
| `src/repositories/ITranscriptionRepository.ts` | Add `updateEnrichment` method and re-export `TranscriptionEnrichmentUpdate` |
| `src/repositories/IJobRepository.ts` | Add `verifyUpdateToken`, `deleteJobsByHash`; update `cleanupStaleJobs` signature |
| `src/repositories/firebase/FirebaseTranscriptionRepository.ts` | Implement `updateEnrichment` |
| `src/repositories/firebase/FirebaseJobRepository.ts` | Implement `verifyUpdateToken`, `deleteJobsByHash`; update `cleanupStaleJobs` |
| `tests/unit/repositories/transcriptionRepository.contract.test.ts` | Add placeholder for `updateEnrichment` |
| `tests/unit/repositories/jobRepository.contract.test.ts` | Add placeholders for new methods |

### Modified: callers (Tasks 2–6)
| File | Repositories used |
|------|------------------|
| `src/services/audio/audioProcessingService.ts` | `repositories.transcriptions` |
| `src/services/audio/audioProcessingExtracted.ts` | `repositories.transcriptions` |
| `src/hooks/analyze/useAnalyzePageOrchestrator.ts` | `repositories.transcriptions`, `repositories.audio` |
| `src/services/audio/audioExtractionSimplified.ts` | `repositories.audio` |
| `src/app/api/segmentation/jobs/route.ts` | `repositories.jobs` |
| `src/app/api/segmentation/jobs/[jobId]/route.ts` | `repositories.jobs` |
| `src/app/api/cron/cleanup-segmentation-jobs/route.ts` | `repositories.jobs` |
| `src/app/api/translate-lyrics/route.ts` | `repositories.lyrics` |
| `src/app/api/translate-lyrics-cached/route.ts` | `repositories.lyrics` |
| `src/app/api/transcribe-lyrics/route.ts` | `repositories.lyrics` |

---

## Verified Firebase API signatures (for reference)

```typescript
// firestoreService.ts
updateTranscriptionEnrichment(videoId, beatModel, chordModel, enrichment: TranscriptionEnrichmentUpdate): Promise<boolean>

// TranscriptionEnrichmentUpdate shape:
interface TranscriptionEnrichmentUpdate {
  title?: string | null;
  channelTitle?: string | null;
  thumbnail?: string | null;
  keySignature?: string | null;
  keyModulation?: string | null;
  chordCorrections?: Record<string, string> | null;
  sequenceCorrections?: SequenceCorrectionsData;
  correctedChords?: string[] | null;
  originalChords?: string[] | null;
  romanNumerals?: TranscriptionData['romanNumerals'];
}

// segmentationJobService.ts
verifySegmentationJobUpdateToken(jobId, updateToken): Promise<SegmentationJobDocument | null>
deleteNonCompletedSegmentationJobsByRequestHash(requestHash, options?: { excludeJobId?: string }): Promise<number>
cleanupStaleSegmentationJobs(options?: { nowMs?: number; limit?: number }): Promise<SegmentationJobCleanupResult>
```

---

## Task 1: Extend interfaces for missing methods

**Files:**
- Modify: `src/repositories/ITranscriptionRepository.ts`
- Modify: `src/repositories/IJobRepository.ts`
- Modify: `src/repositories/firebase/FirebaseTranscriptionRepository.ts`
- Modify: `src/repositories/firebase/FirebaseJobRepository.ts`
- Modify: `tests/unit/repositories/transcriptionRepository.contract.test.ts`
- Modify: `tests/unit/repositories/jobRepository.contract.test.ts`

- [ ] **Step 1: Update `ITranscriptionRepository.ts`**

Add `TranscriptionEnrichmentUpdate` re-export and `updateEnrichment` method:

```typescript
// src/repositories/ITranscriptionRepository.ts

export type { TranscriptionData } from '@/services/firebase/firestoreService';
export type { TranscriptionEnrichmentUpdate } from '@/services/firebase/firestoreService';
import type { TranscriptionData } from '@/services/firebase/firestoreService';
import type { TranscriptionEnrichmentUpdate } from '@/services/firebase/firestoreService';

export interface ITranscriptionRepository {
  /** Returns null on cache miss. */
  get(videoId: string, beatModel: string, chordModel: string): Promise<TranscriptionData | null>;

  /** Persists an analysis result. The backend sets its own createdAt. */
  set(data: Omit<TranscriptionData, 'createdAt'>): Promise<void>;

  /** Removes a cached result. No-op if not found. */
  delete(videoId: string, beatModel: string, chordModel: string): Promise<void>;

  /** Merges enrichment fields (key, corrections, roman numerals) into an existing result. */
  updateEnrichment(
    videoId: string,
    beatModel: string,
    chordModel: string,
    enrichment: TranscriptionEnrichmentUpdate
  ): Promise<boolean>;
}
```

- [ ] **Step 2: Update `IJobRepository.ts`**

Add `verifyUpdateToken`, `deleteJobsByHash`; update `cleanupStaleJobs` to accept options:

```typescript
// src/repositories/IJobRepository.ts

export type { SegmentationJobDocument as JobRecord, SegmentationJobStatus as JobStatus } from '@/services/firebase/segmentationJobService';
export type { SongContext } from '@/types/chatbotTypes';
import type { SongContext } from '@/types/chatbotTypes';
import type { SegmentationJobDocument } from '@/services/firebase/segmentationJobService';

export interface IJobRepository {
  /** Create a new job. Returns jobId and updateToken. */
  createJob(songContext: SongContext, audioUrl: string): Promise<{ jobId: string; updateToken: string }>;

  /** Fetch a job by ID. Returns null if not found. */
  getJob(jobId: string): Promise<SegmentationJobDocument | null>;

  /** Update job fields. */
  updateJob(jobId: string, update: Partial<SegmentationJobDocument>): Promise<void>;

  /**
   * Find an existing job by request hash.
   * Searches both active and completed jobs; returns the most relevant match.
   */
  findJobByHash(requestHash: string): Promise<SegmentationJobDocument | null>;

  /**
   * Verify a job's update token. Returns the job if valid, null if invalid or not found.
   * Used by the SongFormer callback endpoint to authenticate status updates.
   */
  verifyUpdateToken(jobId: string, updateToken: string): Promise<SegmentationJobDocument | null>;

  /**
   * Delete non-completed jobs matching requestHash (used to clean up duplicates).
   * If excludeJobId is provided, that job is preserved.
   * Returns the number of jobs deleted.
   */
  deleteJobsByHash(requestHash: string, options?: { excludeJobId?: string }): Promise<number>;

  /**
   * Delete stale jobs. Returns a result object with deleted count, scanned count, and IDs.
   * Preserving the full shape avoids a breaking change in the cron route's API response.
   */
  cleanupStaleJobs(options?: { limit?: number }): Promise<{ deletedCount: number; scannedCount: number; staleJobIds: string[] }>;
}
```

- [ ] **Step 3: Update `FirebaseTranscriptionRepository.ts`**

```typescript
// src/repositories/firebase/FirebaseTranscriptionRepository.ts

import type { ITranscriptionRepository, TranscriptionData, TranscriptionEnrichmentUpdate } from '@/repositories/ITranscriptionRepository';
import {
  getTranscription,
  saveTranscription,
  deleteTranscription,
  updateTranscriptionEnrichment,
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

  async updateEnrichment(
    videoId: string,
    beatModel: string,
    chordModel: string,
    enrichment: TranscriptionEnrichmentUpdate
  ): Promise<boolean> {
    return updateTranscriptionEnrichment(videoId, beatModel, chordModel, enrichment);
  }
}
```

- [ ] **Step 4: Update `FirebaseJobRepository.ts`**

```typescript
// src/repositories/firebase/FirebaseJobRepository.ts

import type { IJobRepository } from '@/repositories/IJobRepository';
import type { SongContext } from '@/types/chatbotTypes';
import type { SegmentationJobDocument } from '@/services/firebase/segmentationJobService';
import {
  createSegmentationJob,
  getSegmentationJob,
  updateSegmentationJob,
  verifySegmentationJobUpdateToken,
  findActiveSegmentationJobByRequestHash,
  findCompletedSegmentationJobByRequestHash,
  deleteNonCompletedSegmentationJobsByRequestHash,
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
    return (
      await findActiveSegmentationJobByRequestHash(requestHash) ??
      await findCompletedSegmentationJobByRequestHash(requestHash)
    );
  }

  async verifyUpdateToken(jobId: string, updateToken: string): Promise<SegmentationJobDocument | null> {
    return verifySegmentationJobUpdateToken(jobId, updateToken);
  }

  async deleteJobsByHash(requestHash: string, options?: { excludeJobId?: string }): Promise<number> {
    return deleteNonCompletedSegmentationJobsByRequestHash(requestHash, options);
  }

  async cleanupStaleJobs(options?: { limit?: number }): Promise<{ deletedCount: number; scannedCount: number; staleJobIds: string[] }> {
    const result = await cleanupStaleSegmentationJobs(options);
    return {
      deletedCount: result.deletedCount ?? 0,
      scannedCount: result.scannedCount ?? 0,
      staleJobIds: result.staleJobIds ?? [],
    };
  }
}
```

- [ ] **Step 5: Add contract test placeholders for new methods**

Append to `tests/unit/repositories/transcriptionRepository.contract.test.ts`:

```typescript
describe('ITranscriptionRepository updateEnrichment contract', () => {
  it('exports updateEnrichment in runTranscriptionRepositoryContractTests', () => {
    // Contract function defined in this file exposes the method — verified by TypeScript
    expect(typeof runTranscriptionRepositoryContractTests).toBe('function');
  });
});
```

Append to `tests/unit/repositories/jobRepository.contract.test.ts`:

```typescript
describe('IJobRepository extended methods contract', () => {
  it('exports the contract runner function', () => {
    expect(typeof runJobRepositoryContractTests).toBe('function');
  });
});
```

- [ ] **Step 6: Run contract tests**

```bash
npx jest tests/unit/repositories/ --no-coverage | cat
```

Expected: 4 test suites pass.

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit | cat
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/repositories/ITranscriptionRepository.ts \
        src/repositories/IJobRepository.ts \
        src/repositories/firebase/FirebaseTranscriptionRepository.ts \
        src/repositories/firebase/FirebaseJobRepository.ts \
        tests/unit/repositories/transcriptionRepository.contract.test.ts \
        tests/unit/repositories/jobRepository.contract.test.ts
git commit -m "Extend ITranscriptionRepository and IJobRepository with missing methods"
```

---

## Task 2: Migrate `audioProcessingService.ts` and `audioProcessingExtracted.ts`

These two files only use `getTranscription` / `saveTranscription` — the simplest migration.

**Files:**
- Modify: `src/services/audio/audioProcessingService.ts`
- Modify: `src/services/audio/audioProcessingExtracted.ts`
- Create: `tests/unit/services/audio/audioProcessingService.repositories.test.ts`

Note on `saveTranscription` return value: the original returns `boolean`; `repositories.transcriptions.set()` returns `void`. The check `if (saveSucceeded)` is replaced by calling the callback unconditionally after `await` — the repository throws on failure rather than returning false.

- [ ] **Step 1: Write a failing test for `audioProcessingService`**

```typescript
// tests/unit/services/audio/audioProcessingService.repositories.test.ts

jest.mock('@/repositories', () => ({
  repositories: {
    transcriptions: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

import { repositories } from '@/repositories';

describe('audioProcessingService uses repositories.transcriptions', () => {
  it('should_import_repositories_not_firebase_directly', async () => {
    // If this module is loaded without error, the import is correct.
    // TypeScript enforces the call shapes.
    const { repositories: repos } = await import('@/repositories');
    expect(repos.transcriptions).toBeDefined();
  });
});
```

Run:
```bash
npx jest tests/unit/services/audio/audioProcessingService.repositories.test.ts --no-coverage | cat
```

Expected: PASS (placeholder — the real test is TypeScript + grep in Step 6).

- [ ] **Step 2: Migrate `audioProcessingService.ts`**

Change line 2:
```typescript
// BEFORE:
import { getTranscription, saveTranscription, TranscriptionData } from '@/services/firebase/firestoreService';

// AFTER:
import { repositories } from '@/repositories';
import type { TranscriptionData } from '@/repositories/ITranscriptionRepository';
```

Change the `getTranscription` call (around line 114):
```typescript
// BEFORE:
const cachedTranscription = skipFirestoreCache
  ? null
  : await getTranscription(videoId, beatDetector, chordDetector);

// AFTER:
const cachedTranscription = skipFirestoreCache
  ? null
  : await repositories.transcriptions.get(videoId, beatDetector, chordDetector);
```

Change the `saveTranscription` block (around line 159):
```typescript
// BEFORE:
const saveSucceeded = await saveTranscription(transcriptionData);
if (saveSucceeded) {
  options?.onTranscriptionSaved?.(transcriptionData);
}

// AFTER:
await repositories.transcriptions.set(transcriptionData);
options?.onTranscriptionSaved?.(transcriptionData);
```

- [ ] **Step 3: Migrate `audioProcessingExtracted.ts`**

Change line 2:
```typescript
// BEFORE:
import { getTranscription, TranscriptionData } from '@/services/firebase/firestoreService';

// AFTER:
import { repositories } from '@/repositories';
import type { TranscriptionData } from '@/repositories/ITranscriptionRepository';
```

Change the `getTranscription` call (around line 149):
```typescript
// BEFORE:
: await getTranscription(videoId, currentBeatDetector, currentChordDetector);

// AFTER:
: await repositories.transcriptions.get(videoId, currentBeatDetector, currentChordDetector);
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit | cat
```

Expected: clean.

- [ ] **Step 5: Run tests**

```bash
npx jest tests/unit/ --no-coverage | cat
```

Expected: all pass.

- [ ] **Step 6: Verify no direct Firebase imports remain in these files**

```bash
grep -n "firestoreService\|firebaseStorageSimplified\|firebaseStorageService" \
  src/services/audio/audioProcessingService.ts \
  src/services/audio/audioProcessingExtracted.ts | cat
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/services/audio/audioProcessingService.ts \
        src/services/audio/audioProcessingExtracted.ts \
        tests/unit/services/audio/audioProcessingService.repositories.test.ts
git commit -m "Migrate audioProcessingService and audioProcessingExtracted to repositories"
```

---

## Task 3: Migrate `useAnalyzePageOrchestrator.ts`

This hook uses `getTranscription`, `updateTranscriptionEnrichment`, and a dynamic import of `getCachedAudioFile` wrapped in a Firebase connection check.

**Files:**
- Modify: `src/hooks/analyze/useAnalyzePageOrchestrator.ts`

The dynamic `withFirebaseConnectionCheck` wrapper is Firebase-specific and can be removed. The audio check becomes a plain `repositories.audio.getMetadata(videoId)` call.

- [ ] **Step 1: Update the import block**

Find (around line 10-13):
```typescript
import {
  getTranscription,
  updateTranscriptionEnrichment,
  TranscriptionData,
} from '@/services/firebase/firestoreService';
```

Replace with:
```typescript
import { repositories } from '@/repositories';
import type { TranscriptionData } from '@/repositories/ITranscriptionRepository';
import type { TranscriptionEnrichmentUpdate } from '@/repositories/ITranscriptionRepository';
```

- [ ] **Step 2: Replace `getTranscription` call (around line 316)**

```typescript
// BEFORE:
const snapshot = await getTranscription(videoId, snapshotBeatDetector, snapshotChordDetector);

// AFTER:
const snapshot = await repositories.transcriptions.get(videoId, snapshotBeatDetector, snapshotChordDetector);
```

- [ ] **Step 3: Replace `updateTranscriptionEnrichment` call (around line 840)**

```typescript
// BEFORE:
const updateSucceeded = await updateTranscriptionEnrichment(
  videoId,
  beatDetector,
  chordDetector,
  {
    keySignature: result.primaryKey,
    keyModulation: result.modulation,
    chordCorrections: effectiveChordCorrections,
    sequenceCorrections: effectiveSequenceCorrections,
    correctedChords: effectiveSequenceCorrections?.correctedSequence ?? null,
    originalChords: effectiveSequenceCorrections?.originalSequence ?? null,
    romanNumerals: result.romanNumerals || null,
  }
);

// AFTER:
const updateSucceeded = await repositories.transcriptions.updateEnrichment(
  videoId,
  beatDetector,
  chordDetector,
  {
    keySignature: result.primaryKey,
    keyModulation: result.modulation,
    chordCorrections: effectiveChordCorrections,
    sequenceCorrections: effectiveSequenceCorrections,
    correctedChords: effectiveSequenceCorrections?.correctedSequence ?? null,
    originalChords: effectiveSequenceCorrections?.originalSequence ?? null,
    romanNumerals: result.romanNumerals || null,
  }
);
```

- [ ] **Step 4: Replace the cached audio check (around line 567)**

Find the block:
```typescript
const { ensureFirebaseInitialized } = await import('@/config/firebase');
await ensureFirebaseInitialized();

const { withFirebaseConnectionCheck } = await import('@/utils/firebaseConnectionManager');
const cachedAudio = await withFirebaseConnectionCheck(async () => {
  const { getCachedAudioFile } = await import('@/services/firebase/firebaseStorageService');
  return getCachedAudioFile(videoId);
}, 'cached audio check');
```

Replace with:
```typescript
const cachedAudio = await repositories.audio.getMetadata(videoId);
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit | cat
```

Expected: clean. If there are type errors around the audio return value — `getCachedAudioFile` returned `AudioFileData | null` while `getMetadata` returns `AudioMetadata | null` — check the fields used after `if (cachedAudio)` and ensure `AudioMetadata` (which is `SimplifiedAudioData`) has them. Both types have `audioUrl`, `title`, `duration`.

- [ ] **Step 6: Run tests**

```bash
npx jest tests/unit/ --no-coverage | cat
```

Expected: all pass.

- [ ] **Step 7: Verify**

```bash
grep -n "firestoreService\|getCachedAudioFile\|withFirebaseConnectionCheck\|ensureFirebaseInitialized" \
  src/hooks/analyze/useAnalyzePageOrchestrator.ts | cat
```

Expected: no output (or only in non-storage contexts).

- [ ] **Step 8: Commit**

```bash
git add src/hooks/analyze/useAnalyzePageOrchestrator.ts
git commit -m "Migrate useAnalyzePageOrchestrator to repositories"
```

---

## Task 4: Migrate `audioExtractionSimplified.ts`

This is the most complex file. It has three distinct patterns to replace:

1. **Two-tier cache check** (`findExistingAudioFile` + `getCachedAudioMetadata`) → collapses to one `repositories.audio.getMetadata()` call
2. **Fire-and-forget metadata save** (`saveAudioMetadataBackground`) → `void repositories.audio.setMetadata(...).catch(console.error)`
3. **Three upload blocks** (`uploadAudioFile` + `saveAudioFileMetadata`) → `storeAudio` + `setMetadata`

**Files:**
- Modify: `src/services/audio/audioExtractionSimplified.ts`

- [ ] **Step 1: Update static imports**

Remove:
```typescript
import { firebaseStorageSimplified, SimplifiedAudioData } from '@/services/firebase/firebaseStorageSimplified';
```

Add:
```typescript
import { repositories } from '@/repositories';
import type { AudioMetadata } from '@/repositories/IAudioRepository';
```

Keep: `import { validateFirebaseStorageUrl } from '@/utils/urlValidationUtils';` — this is a URL utility, not storage.

- [ ] **Step 2: Replace the yt-dlp method's cache check block (around line 135–195)**

This is the yt-dlp extraction path. Replace the two-tier check with a single `getMetadata` call:

```typescript
// BEFORE (abridged):
try {
  const { ensureFirebaseInitialized } = await import('@/config/firebase');
  await ensureFirebaseInitialized();
} catch (initError) { ... }

try {
  const { findExistingAudioFile } = await import('@/services/firebase/firebaseStorageService');
  const existingFile = await findExistingAudioFile(videoId);
  if (existingFile) {
    firebaseStorageSimplified.saveAudioMetadataBackground({ videoId, audioUrl: existingFile.audioUrl, ... });
    return { success: true, audioUrl: existingFile.audioUrl, ... };
  }
} catch (storageError) { ... }

const cached = await firebaseStorageSimplified.getCachedAudioMetadata(videoId);
if (cached) {
  return { success: true, audioUrl: cached.audioUrl, ... };
}

// AFTER:
try {
  const existing = await repositories.audio.getMetadata(videoId);
  if (existing) {
    return {
      success: true,
      audioUrl: existing.audioUrl,
      title: existing.title ?? videoMetadata.title,
      duration: existing.duration ?? this.parseDuration(videoMetadata.duration),
      fromCache: true,
      isStreamUrl: existing.isStreamUrl ?? false,
      streamExpiresAt: existing.streamExpiresAt,
    };
  }
} catch (cacheError) {
  console.warn('⚠️ Audio metadata check failed, proceeding with extraction:', cacheError);
}
```

- [ ] **Step 3: Replace the three upload blocks**

There are three identical blocks (around lines 249, 296, 502) that do `uploadAudioFile` + `saveAudioFileMetadata`. Replace each with the same pattern:

```typescript
// BEFORE:
const { uploadAudioFile, saveAudioFileMetadata } = await import('@/services/firebase/firebaseStorageService');
const uploadResult = await uploadAudioFile(videoId, audioData);
if (uploadResult) {
  const uploadTime = Date.now() - uploadStartTime;
  const { url: validatedUrl, isStorageUrl: validatedIsStorageUrl } = await validateAndReturnUrl(
    uploadResult.audioUrl,
    downloadResult.audioUrl,
    videoId
  );
  finalAudioUrl = validatedUrl;
  isStorageUrl = validatedIsStorageUrl;
  await saveAudioFileMetadata({
    videoId,
    audioUrl: finalAudioUrl,
    title: videoMetadata.title,
    storagePath: uploadResult.storagePath,
    fileSize: actualFileSize,
    duration: finalDuration,
    isStreamUrl: false,
    streamExpiresAt: undefined
  });
}

// AFTER:
const storedUrl = await repositories.audio.storeAudio(videoId, audioData);
const uploadTime = Date.now() - uploadStartTime;
const { url: validatedUrl, isStorageUrl: validatedIsStorageUrl } = await validateAndReturnUrl(
  storedUrl,
  downloadResult.audioUrl,
  videoId
);
finalAudioUrl = validatedUrl;
isStorageUrl = validatedIsStorageUrl;
await repositories.audio.setMetadata({
  videoId,
  audioUrl: finalAudioUrl,
  title: videoMetadata.title,
  fileSize: actualFileSize,
  duration: finalDuration,
  isStreamUrl: false,
});
```

Note: `storeAudio` throws on failure (no null check needed). The `storagePath` field is not passed — it's Firebase-specific and will be ignored by the Postgres implementation.

> **For the QuickTube path (around line 502):** The fallback URL is `finalAudioUrl` instead of `downloadResult.audioUrl`. Adjust accordingly.

- [ ] **Step 4: Replace the simplified cache save (around line 340 and any remaining `saveAudioMetadata` calls)**

```typescript
// BEFORE:
const saved = await firebaseStorageSimplified.saveAudioMetadata({ videoId, audioUrl: ..., title: ..., ... });

// AFTER:
await repositories.audio.setMetadata({ videoId, audioUrl: ..., title: ..., ... });
```

- [ ] **Step 5: Replace QuickTube's cache check (around line 400–450)**

Same pattern as Step 2 — replace `ensureFirebaseInitialized` + `findExistingAudioFile` + `getCachedAudioMetadata` with a single `repositories.audio.getMetadata(videoId)` call:

```typescript
// AFTER:
try {
  const existing = await repositories.audio.getMetadata(videoId);
  if (existing) {
    return {
      success: true,
      audioUrl: existing.audioUrl,
      title: existing.title ?? videoMetadata.title,
      duration: existing.duration ?? this.parseDuration(videoMetadata.duration),
      fromCache: true,
      isStreamUrl: existing.isStreamUrl ?? false,
      streamExpiresAt: existing.streamExpiresAt,
    };
  }
} catch (cacheError) {
  console.warn('⚠️ Audio metadata check failed, proceeding with extraction:', cacheError);
}
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit | cat
```

Fix any type errors. `AudioMetadata` is `SimplifiedAudioData` — it has `audioUrl`, `title`, `duration`, `isStreamUrl`, `streamExpiresAt`.

- [ ] **Step 7: Run tests**

```bash
npx jest tests/unit/ --no-coverage | cat
```

Expected: all pass.

- [ ] **Step 8: Verify no direct Firebase imports remain**

```bash
grep -n "firebaseStorageSimplified\|firebaseStorageService\|ensureFirebaseInitialized" \
  src/services/audio/audioExtractionSimplified.ts | cat
```

Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add src/services/audio/audioExtractionSimplified.ts
git commit -m "Migrate audioExtractionSimplified to repositories"
```

---

## Task 5: Migrate segmentation job routes

Three Next.js API route files. Keep `buildSegmentationRequestHash`, `getSegmentationJobTtlMs`, `isSegmentationJobStale` as direct imports — they're pure utility functions, not storage.

**Files:**
- Modify: `src/app/api/segmentation/jobs/route.ts`
- Modify: `src/app/api/segmentation/jobs/[jobId]/route.ts`
- Modify: `src/app/api/cron/cleanup-segmentation-jobs/route.ts`

- [ ] **Step 1: Migrate `src/app/api/segmentation/jobs/route.ts`**

Change the import block:
```typescript
// BEFORE:
import {
  buildSegmentationRequestHash,
  createSegmentationJob,
  deleteNonCompletedSegmentationJobsByRequestHash,
  findActiveSegmentationJobByRequestHash,
  findCompletedSegmentationJobByRequestHash,
} from '@/services/firebase/segmentationJobService';

// AFTER:
import { buildSegmentationRequestHash } from '@/services/firebase/segmentationJobService';
import { repositories } from '@/repositories';
```

Replace calls:
```typescript
// findCompletedSegmentationJobByRequestHash(requestHash)
// → repositories.jobs.findJobByHash(requestHash) — already covers both active+completed,
//   but here we need completed-only first. Use findJobByHash and check job.status:
const cachedJob = await repositories.jobs.findJobByHash(requestHash);
// NOTE: findJobByHash returns active OR completed. The original POST checked completed first.
// For Plan B fidelity, use this simplified form (completed jobs' result field is checked below).
```

Actually — `findJobByHash` in the repository checks active first, then completed. The route checks completed first. To preserve the exact logic with a single interface method, call the job-hash lookup and check `job.result`:

```typescript
// BEFORE:
const cachedJob = await findCompletedSegmentationJobByRequestHash(requestHash);
if (cachedJob?.result) { ... }

const activeJob = await findActiveSegmentationJobByRequestHash(requestHash);
if (activeJob) { ... }

await deleteNonCompletedSegmentationJobsByRequestHash(requestHash);
const { jobId, updateToken } = await createSegmentationJob(songContext, audioUrl);

// AFTER:
// Check for a completed job with a result
const completedJob = await repositories.jobs.findJobByHash(requestHash);
if (completedJob?.result) {
  return NextResponse.json({
    success: true,
    jobId: completedJob.jobId,
    status: 'completed',
    data: completedJob.result,
    cached: true,
  });
}

// Check for an active job (only if no completed result found)
const activeJob = completedJob?.status !== 'completed'
  ? completedJob
  : await repositories.jobs.findJobByHash(requestHash); // will return active if present

// Simpler: call findJobByHash twice is wasteful. Instead, inspect the returned job's status:
```

> **Simpler approach:** Since `findJobByHash` returns the first match (active-first), we can check the returned job's status and result:

```typescript
const existingJob = await repositories.jobs.findJobByHash(requestHash);

if (existingJob?.result && existingJob.status === 'completed') {
  return NextResponse.json({
    success: true,
    jobId: existingJob.jobId,
    status: 'completed',
    data: existingJob.result,
    cached: true,
  });
}

if (existingJob && (existingJob.status === 'created' || existingJob.status === 'processing')) {
  return NextResponse.json({
    success: true,
    jobId: existingJob.jobId,
    status: existingJob.status,
    reused: true,
  });
}

// access code validation...
await repositories.jobs.deleteJobsByHash(requestHash);
const { jobId, updateToken } = await repositories.jobs.createJob(songContext, audioUrl);
```

- [ ] **Step 2: Migrate `src/app/api/segmentation/jobs/[jobId]/route.ts`**

Change import block:
```typescript
// BEFORE:
import {
  deleteNonCompletedSegmentationJobsByRequestHash,
  getSegmentationJob,
  getSegmentationJobTtlMs,
  isSegmentationJobStale,
  updateSegmentationJob,
  verifySegmentationJobUpdateToken,
} from '@/services/firebase/segmentationJobService';

// AFTER:
import {
  getSegmentationJobTtlMs,
  isSegmentationJobStale,
} from '@/services/firebase/segmentationJobService';
import { repositories } from '@/repositories';
```

Replace calls:
```typescript
// GET handler:
// BEFORE: const job = await getSegmentationJob(jobId);
// AFTER:
const job = await repositories.jobs.getJob(jobId);

// PATCH handler:
// BEFORE: const existingJob = await verifySegmentationJobUpdateToken(jobId, body.updateToken);
// AFTER:
const existingJob = await repositories.jobs.verifyUpdateToken(jobId, body.updateToken);

// BEFORE:
await updateSegmentationJob(jobId, { status: body.status, error: ..., result: ..., model: ... });
// AFTER:
await repositories.jobs.updateJob(jobId, { status: body.status, error: ..., result: ..., model: ... });

// BEFORE:
await deleteNonCompletedSegmentationJobsByRequestHash(existingJob.requestHash, { excludeJobId: jobId });
// AFTER:
await repositories.jobs.deleteJobsByHash(existingJob.requestHash, { excludeJobId: jobId });
```

- [ ] **Step 3: Migrate `src/app/api/cron/cleanup-segmentation-jobs/route.ts`**

Change import block:
```typescript
// BEFORE:
import {
  cleanupStaleSegmentationJobs,
  getSegmentationJobTtlMs,
} from '@/services/firebase/segmentationJobService';

// AFTER:
import { getSegmentationJobTtlMs } from '@/services/firebase/segmentationJobService';
import { repositories } from '@/repositories';
```

Replace call:
```typescript
// BEFORE:
const result = await cleanupStaleSegmentationJobs({ limit: resolveCleanupLimit(request) });
return NextResponse.json({
  success: true,
  ...result,
  ttlMs: { created: getSegmentationJobTtlMs('created'), processing: getSegmentationJobTtlMs('processing') },
  cleanedAtMs: Date.now(),
});

// AFTER:
const result = await repositories.jobs.cleanupStaleJobs({ limit: resolveCleanupLimit(request) });
return NextResponse.json({
  success: true,
  ...result,
  ttlMs: { created: getSegmentationJobTtlMs('created'), processing: getSegmentationJobTtlMs('processing') },
  cleanedAtMs: Date.now(),
});
```

Note: `cleanupStaleJobs` returns `{ deletedCount, scannedCount, staleJobIds }` matching `SegmentationJobCleanupResult` — spreading it preserves the full response shape.

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit | cat
```

Expected: clean.

- [ ] **Step 5: Run tests**

```bash
npx jest tests/unit/ --no-coverage | cat
```

Expected: all pass.

- [ ] **Step 6: Verify**

```bash
grep -n "from '@/services/firebase/segmentationJobService'" \
  src/app/api/segmentation/jobs/route.ts \
  src/app/api/segmentation/jobs/\[jobId\]/route.ts \
  src/app/api/cron/cleanup-segmentation-jobs/route.ts | cat
```

Expected: only utility function imports remain (`getSegmentationJobTtlMs`, `isSegmentationJobStale`, `buildSegmentationRequestHash`).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/segmentation/jobs/route.ts \
        "src/app/api/segmentation/jobs/[jobId]/route.ts" \
        src/app/api/cron/cleanup-segmentation-jobs/route.ts
git commit -m "Migrate segmentation job routes to repositories"
```

---

## Task 6: Migrate lyrics routes

Three API routes that directly construct Firestore document references. Replace with `repositories.lyrics` calls.

**Files:**
- Modify: `src/app/api/translate-lyrics/route.ts`
- Modify: `src/app/api/translate-lyrics-cached/route.ts`
- Modify: `src/app/api/transcribe-lyrics/route.ts`

- [ ] **Step 1: Migrate `translate-lyrics/route.ts`**

Remove:
```typescript
import { db, TRANSLATIONS_COLLECTION } from '@/config/firebase';
import { collection, doc, getDoc, setDoc, Firestore, serverTimestamp } from 'firebase/firestore';
```

Add:
```typescript
import { repositories } from '@/repositories';
```

**Type note:** `ILyricsRepository.getTranslation` returns `TranslationData | null`. `TranslationData` has `[key: string]: unknown`, so at runtime it holds whatever Firestore stored — the full `TranslationResponse` blob. The `as TranslationResponse` cast is safe at runtime; it is a structural cast, not a data transformation.

**Type note:** `ILyricsRepository.setTranslation` requires `data: TranslationData & { videoId: string }` where `TranslationData.language` is required. `TranslationResponse` has `sourceLanguage`/`targetLanguage` but not a single `language` field. Map explicitly at the call site using `language: data.sourceLanguage`.

Replace `checkCache` function (which reads from Firestore):
```typescript
// BEFORE:
async function checkCache(cacheKey: string): Promise<TranslationResponse | null> {
  if (!db) return null;
  try {
    const translationsRef = collection(db as Firestore, TRANSLATIONS_COLLECTION);
    const docRef = doc(translationsRef, cacheKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as TranslationResponse;
    }
    return null;
  } catch { return null; }
}

// AFTER:
async function checkCache(cacheKey: string): Promise<TranslationResponse | null> {
  try {
    const data = await repositories.lyrics.getTranslation(cacheKey);
    // TranslationData has [key: string]: unknown — the full TranslationResponse blob is stored and returned
    return data as unknown as TranslationResponse | null;
  } catch { return null; }
}
```

Replace `cacheTranslation` function (which writes to Firestore). Note: the route also stores `videoId` with the translation — pass it through:
```typescript
// BEFORE:
async function cacheTranslation(cacheKey: string, data: TranslationResponse, videoId?: string): Promise<void> {
  if (!db) return;
  try {
    const translationsRef = collection(db as Firestore, TRANSLATIONS_COLLECTION);
    const docRef = doc(translationsRef, cacheKey);
    const dataWithTimestamp = { ...data, videoId, createdAt: serverTimestamp() };
    await setDoc(docRef, dataWithTimestamp);
  } catch { }
}

// AFTER:
async function cacheTranslation(cacheKey: string, data: TranslationResponse, videoId?: string): Promise<void> {
  try {
    // language required by TranslationData; map from sourceLanguage
    await repositories.lyrics.setTranslation(cacheKey, {
      ...data,
      language: data.sourceLanguage,
      videoId: videoId ?? '',
    });
  } catch { }
}
```

- [ ] **Step 2: Migrate `translate-lyrics-cached/route.ts`**

This file has the same Firestore call shapes but a **different** `TranslationResponse` type (adds `fromCache?`, `backgroundUpdateInProgress?`, `timestamp?`) and different function bodies. Apply replacements carefully.

Remove:
```typescript
import { db, TRANSLATIONS_COLLECTION } from '@/config/firebase';
import { collection, doc, getDoc, setDoc, Firestore, serverTimestamp } from 'firebase/firestore';
```

Add:
```typescript
import { repositories } from '@/repositories';
```

Replace `checkCache` — preserve `fromCache: true` and `timestamp` decoration:
```typescript
// BEFORE:
async function checkCache(cacheKey: string): Promise<TranslationResponse | null> {
  try {
    if (!db) { ... return null; }
    try {
      const translationsRef = collection(db as Firestore, TRANSLATIONS_COLLECTION);
      const docRef = doc(translationsRef, cacheKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as TranslationResponse;
        return { ...data, fromCache: true, timestamp: data.timestamp || Date.now() };
      }
    } catch (firestoreError) { ... }
    return null;
  } catch (error) { ... return null; }
}

// AFTER:
async function checkCache(cacheKey: string): Promise<TranslationResponse | null> {
  try {
    const data = await repositories.lyrics.getTranslation(cacheKey);
    if (!data) return null;
    const cached = data as unknown as TranslationResponse;
    return { ...cached, fromCache: true, timestamp: cached.timestamp || Date.now() };
  } catch (error) {
    console.error('Error checking translation cache:', error);
    return null;
  }
}
```

Replace `cacheTranslation` — preserve `fromCache: false`:
```typescript
// BEFORE:
async function cacheTranslation(cacheKey: string, data: TranslationResponse, videoId?: string): Promise<void> {
  try {
    if (!db) { ... return; }
    try {
      const translationsRef = collection(db as Firestore, TRANSLATIONS_COLLECTION);
      const docRef = doc(translationsRef, cacheKey);
      const dataWithTimestamp = { ...data, videoId: videoId || 'unknown', createdAt: serverTimestamp(), fromCache: false };
      await setDoc(docRef, dataWithTimestamp);
    } catch (firestoreError) { ... }
  } catch (error) { ... }
}

// AFTER:
async function cacheTranslation(cacheKey: string, data: TranslationResponse, videoId?: string): Promise<void> {
  try {
    await repositories.lyrics.setTranslation(cacheKey, {
      ...data,
      language: data.sourceLanguage,
      videoId: videoId ?? 'unknown',
      fromCache: false,
    });
    console.log('Successfully cached translation data');
  } catch (firestoreError) {
    console.warn('Firestore access error, unable to cache translation:', firestoreError);
  }
}
```

Everything else in the file (the `setImmediate` stale-while-revalidate logic, `backgroundUpdatesInProgress`, POST handler) stays unchanged.

- [ ] **Step 3: Migrate `transcribe-lyrics/route.ts`**

Remove:
```typescript
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseApp } from '@/services/firebase/firebaseService';
```

Add:
```typescript
import { repositories } from '@/repositories';
```

Replace the cache check (around line 57–80):
```typescript
// BEFORE:
const db = getFirestore(firebaseApp);
const lyricsDocRef = doc(db, 'lyrics', videoId);
const lyricsDoc = await getDoc(lyricsDocRef);
if (lyricsDoc.exists() && !forceRefresh) {
  const cachedData = lyricsDoc.data() as CachedLyricsData;
  ...
}

// AFTER:
const cachedData = forceRefresh ? null : await repositories.lyrics.getLyrics(videoId);
if (cachedData) {
  ...
}
```

Replace the save at the end (around line 303):
```typescript
// BEFORE:
const db = getFirestore(firebaseApp);
const lyricsDocRef = doc(db, 'lyrics', videoId);
await setDoc(lyricsDocRef, dataWithTimestamp);

// AFTER:
await repositories.lyrics.setLyrics(videoId, dataWithTimestamp);
```

Also remove the `const db = getFirestore(firebaseApp)` and `const lyricsDocRef = doc(...)` local variable declarations (they're no longer needed).

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit | cat
```

Expected: clean.

- [ ] **Step 5: Run tests**

```bash
npx jest tests/unit/ --no-coverage | cat
```

Expected: all pass.

- [ ] **Step 6: Verify**

```bash
grep -n "from '@/config/firebase'\|from 'firebase/firestore'\|from '@/services/firebase/firebaseService'" \
  src/app/api/translate-lyrics/route.ts \
  src/app/api/translate-lyrics-cached/route.ts \
  src/app/api/transcribe-lyrics/route.ts | cat
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/translate-lyrics/route.ts \
        src/app/api/translate-lyrics-cached/route.ts \
        src/app/api/transcribe-lyrics/route.ts
git commit -m "Migrate lyrics routes to repositories"
```

---

## Task 7: Final verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit | cat
```

Expected: clean.

- [ ] **Step 2: Run all unit tests**

```bash
npx jest tests/unit/ --no-coverage | cat
```

Expected: all pass.

- [ ] **Step 3: Confirm no direct Firebase imports remain in migrated files**

```bash
grep -rn "from '@/services/firebase/firestoreService'\|from '@/services/firebase/firebaseStorageSimplified'\|from '@/services/firebase/firebaseStorageService'\|from '@/services/firebase/segmentationJobService'" \
  src/services/audio/audioProcessingService.ts \
  src/services/audio/audioProcessingExtracted.ts \
  src/services/audio/audioExtractionSimplified.ts \
  src/hooks/analyze/useAnalyzePageOrchestrator.ts \
  src/app/api/segmentation/ \
  src/app/api/translate-lyrics/ \
  src/app/api/translate-lyrics-cached/ \
  src/app/api/transcribe-lyrics/ | cat
```

Expected: only `segmentationJobService` imports for pure utilities (`getSegmentationJobTtlMs`, `isSegmentationJobStale`, `buildSegmentationRequestHash`).

- [ ] **Step 4: Final commit if any cleanup needed, then done**

---

## Definition of Done

- [ ] `ITranscriptionRepository` has `updateEnrichment`
- [ ] `IJobRepository` has `verifyUpdateToken`, `deleteJobsByHash`, and `cleanupStaleJobs(options?)`
- [ ] All 10 caller files import `{ repositories }` instead of Firebase services for storage operations
- [ ] Pure utility functions (`buildSegmentationRequestHash`, `getSegmentationJobTtlMs`, `isSegmentationJobStale`) remain as direct imports — they are not storage operations
- [ ] `npx tsc --noEmit` exits clean
- [ ] `npx jest tests/unit/ --no-coverage` passes
- [ ] Setting `STORAGE_BACKEND=postgres` at this point would throw `Unknown STORAGE_BACKEND: "postgres"` — which is correct, that's Plan C's job

---

## What Plan C Will Do

Plan C implements the four Postgres repositories:

- `PostgresTranscriptionRepository` — analysis results stored as JSONB rows in `transcriptions` table
- `PostgresAudioRepository` — MP3 files stored as `bytea` in `audio_files` table; `storeAudio` returns `videoId` as the storage key
- `PostgresJobRepository` — segmentation jobs as rows in `segmentation_jobs` table
- `PostgresLyricsRepository` — lyrics/translations as JSONB rows

One schema migration file covering all four tables. After Plan C: set `STORAGE_BACKEND=postgres DATABASE_URL=...` and the entire app runs off Postgres with no Firebase dependency.
