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
   * Node Buffer callers: pass `buffer.buffer` to get the underlying ArrayBuffer.
   */
  storeAudio(videoId: string, data: ArrayBuffer, mimeType?: string): Promise<string>;

  /** Returns true if audio has been stored for this videoId. */
  audioExists(videoId: string): Promise<boolean>;

  /**
   * Retrieve raw audio bytes for a videoId.
   * Returns null if no bytes have been stored (e.g., Firebase backend does not store bytes locally).
   */
  getAudio(videoId: string): Promise<Buffer | null>;
}
