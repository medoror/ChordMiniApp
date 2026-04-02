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
