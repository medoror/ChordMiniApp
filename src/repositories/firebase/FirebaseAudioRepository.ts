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
