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
   * Stores audio bytes in the database and returns an HTTP-accessible absolute URL.
   * The URL is built from APP_BASE_URL (default: http://localhost:3000) so that
   * server-side consumers (e.g. the Python ML backend) can fetch the audio over HTTP.
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
    const baseUrl = (process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
    return `${baseUrl}/api/audio/${videoId}`;
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

  async getAudio(videoId: string): Promise<Buffer | null> {
    const { rows } = await query<{ audio_data: Buffer }>(
      'SELECT audio_data FROM audio_files WHERE video_id = $1 AND audio_data IS NOT NULL',
      [videoId]
    );
    return rows[0]?.audio_data ?? null;
  }
}
