import type { IAudioRepository, AudioMetadata } from '@/repositories/IAudioRepository';
import { query } from './db';

export class PostgresAudioRepository implements IAudioRepository {
  async getMetadata(videoId: string): Promise<AudioMetadata | null> {
    const { rows } = await query<{ metadata: AudioMetadata }>(
      'SELECT metadata FROM audio_files WHERE video_id = $1',
      [videoId]
    );
    return rows[0]?.metadata ?? null;
  }

  async setMetadata(
    data: { videoId: string; audioUrl: string; title: string; [key: string]: unknown }
  ): Promise<void> {
    await query(
      `INSERT INTO audio_files (video_id, metadata)
       VALUES ($1, $2)
       ON CONFLICT (video_id) DO UPDATE SET metadata = EXCLUDED.metadata`,
      [data.videoId, JSON.stringify(data)]
    );
  }

  /**
   * Stores audio bytes in the database and returns a synthetic storage URL.
   * The URL format `db://audio/{videoId}` is a stable key for this video's audio.
   * HTTP playback routing is handled separately (out of scope for Plan C).
   */
  async storeAudio(
    videoId: string,
    data: ArrayBuffer,
    _mimeType = 'audio/mpeg'
  ): Promise<string> {
    const buffer = Buffer.from(data);
    await query(
      `INSERT INTO audio_files (video_id, audio_data)
       VALUES ($1, $2)
       ON CONFLICT (video_id) DO UPDATE SET audio_data = EXCLUDED.audio_data`,
      [videoId, buffer]
    );
    return `db://audio/${videoId}`;
  }

  async audioExists(videoId: string): Promise<boolean> {
    const { rows } = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM audio_files WHERE video_id = $1 AND audio_data IS NOT NULL
       ) AS exists`,
      [videoId]
    );
    return rows[0]?.exists ?? false;
  }
}
