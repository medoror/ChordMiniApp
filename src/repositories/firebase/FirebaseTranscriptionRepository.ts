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
