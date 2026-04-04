import type {
  ILyricsRepository,
  LyricsData,
  TranslationData,
} from '@/repositories/ILyricsRepository';
import { query } from './db';

export class PostgresLyricsRepository implements ILyricsRepository {
  async getLyrics(videoId: string): Promise<LyricsData | null> {
    const { rows } = await query<{ data: LyricsData }>(
      'SELECT data FROM lyrics WHERE video_id = $1',
      [videoId]
    );
    return rows[0]?.data ?? null;
  }

  async setLyrics(videoId: string, data: LyricsData): Promise<void> {
    await query(
      `INSERT INTO lyrics (video_id, data)
       VALUES ($1, $2)
       ON CONFLICT (video_id) DO UPDATE SET data = EXCLUDED.data`,
      [videoId, JSON.stringify(data)]
    );
  }

  async getTranslation(cacheKey: string): Promise<TranslationData | null> {
    const { rows } = await query<{ data: TranslationData }>(
      'SELECT data FROM translations WHERE cache_key = $1',
      [cacheKey]
    );
    return rows[0]?.data ?? null;
  }

  async setTranslation(
    cacheKey: string,
    data: TranslationData & { videoId: string }
  ): Promise<void> {
    await query(
      `INSERT INTO translations (cache_key, video_id, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (cache_key) DO UPDATE SET data = EXCLUDED.data`,
      [cacheKey, data.videoId, JSON.stringify(data)]
    );
  }
}
