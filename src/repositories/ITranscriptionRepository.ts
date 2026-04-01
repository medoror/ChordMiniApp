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
