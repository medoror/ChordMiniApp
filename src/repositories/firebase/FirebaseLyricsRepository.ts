import type { ILyricsRepository, LyricsData, TranslationData } from '@/repositories/ILyricsRepository';
import { TRANSLATIONS_COLLECTION } from '@/config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseApp } from '@/services/firebase/firebaseService';
import { getFirestore } from 'firebase/firestore';

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
