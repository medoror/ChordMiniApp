import type {
  ITranscriptionRepository,
  TranscriptionData,
  TranscriptionEnrichmentUpdate,
} from '@/repositories/ITranscriptionRepository';
import { query } from './db';

export class PostgresTranscriptionRepository implements ITranscriptionRepository {
  async get(
    videoId: string,
    beatModel: string,
    chordModel: string
  ): Promise<TranscriptionData | null> {
    const { rows } = await query<{ data: TranscriptionData }>(
      'SELECT data FROM transcriptions WHERE video_id = $1 AND beat_model = $2 AND chord_model = $3',
      [videoId, beatModel, chordModel]
    );
    return rows[0]?.data ?? null;
  }

  async set(data: Omit<TranscriptionData, 'createdAt'>): Promise<void> {
    await query(
      `INSERT INTO transcriptions (video_id, beat_model, chord_model, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (video_id, beat_model, chord_model)
       DO UPDATE SET data = EXCLUDED.data, created_at = NOW()`,
      [data.videoId, data.beatModel, data.chordModel, JSON.stringify(data)]
    );
  }

  async delete(
    videoId: string,
    beatModel: string,
    chordModel: string
  ): Promise<void> {
    await query(
      'DELETE FROM transcriptions WHERE video_id = $1 AND beat_model = $2 AND chord_model = $3',
      [videoId, beatModel, chordModel]
    );
  }

  async updateEnrichment(
    videoId: string,
    beatModel: string,
    chordModel: string,
    enrichment: TranscriptionEnrichmentUpdate
  ): Promise<boolean> {
    const { rows } = await query<{ data: TranscriptionData }>(
      'SELECT data FROM transcriptions WHERE video_id = $1 AND beat_model = $2 AND chord_model = $3',
      [videoId, beatModel, chordModel]
    );
    if (!rows[0]) return false;
    const merged = { ...rows[0].data, ...enrichment };
    await query(
      `UPDATE transcriptions
       SET data = $4, created_at = NOW()
       WHERE video_id = $1 AND beat_model = $2 AND chord_model = $3`,
      [videoId, beatModel, chordModel, JSON.stringify(merged)]
    );
    return true;
  }
}
