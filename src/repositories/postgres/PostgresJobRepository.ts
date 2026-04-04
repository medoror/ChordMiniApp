import crypto from 'crypto';
import type { IJobRepository } from '@/repositories/IJobRepository';
import type { SongContext } from '@/types/chatbotTypes';
import type { SegmentationJobDocument } from '@/services/firebase/segmentationJobService';
import { buildSegmentationRequestHash } from '@/services/firebase/segmentationJobService';
import { query } from './db';

export class PostgresJobRepository implements IJobRepository {
  async createJob(
    songContext: SongContext,
    audioUrl: string
  ): Promise<{ jobId: string; updateToken: string }> {
    const jobId = `seg_${Date.now()}_${crypto.randomUUID()}`;
    const updateToken = crypto.randomUUID();
    const updateTokenHash = crypto.createHash('sha256').update(updateToken).digest('hex');
    const requestHash = buildSegmentationRequestHash(songContext, audioUrl);
    const now = Date.now();
    const job: SegmentationJobDocument = {
      jobId,
      requestHash,
      status: 'created',
      title: songContext.title,
      videoId: songContext.videoId,
      uploadId: songContext.uploadId,
      audioUrl,
      updateTokenHash,
      createdAtMs: now,
      updatedAtMs: now,
    };
    await query(
      `INSERT INTO segmentation_jobs
         (job_id, request_hash, status, data, created_at_ms, updated_at_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [jobId, requestHash, 'created', JSON.stringify(job), now, now]
    );
    return { jobId, updateToken };
  }

  async getJob(jobId: string): Promise<SegmentationJobDocument | null> {
    const { rows } = await query<{ data: SegmentationJobDocument }>(
      'SELECT data FROM segmentation_jobs WHERE job_id = $1',
      [jobId]
    );
    return rows[0]?.data ?? null;
  }

  async updateJob(
    jobId: string,
    update: Partial<SegmentationJobDocument>
  ): Promise<void> {
    const { rows } = await query<{ data: SegmentationJobDocument }>(
      'SELECT data FROM segmentation_jobs WHERE job_id = $1',
      [jobId]
    );
    if (!rows[0]) return;
    const merged: SegmentationJobDocument = { ...rows[0].data, ...update };
    const now = Date.now();
    await query(
      `UPDATE segmentation_jobs
       SET data = $2,
           status = $3,
           updated_at_ms = $4,
           completed_at_ms = $5,
           stale_at_ms = $6
       WHERE job_id = $1`,
      [
        jobId,
        JSON.stringify(merged),
        merged.status,
        now,
        merged.completedAtMs ?? null,
        merged.staleAtMs ?? null,
      ]
    );
  }

  async findJobByHash(
    requestHash: string
  ): Promise<SegmentationJobDocument | null> {
    const { rows: active } = await query<{ data: SegmentationJobDocument }>(
      `SELECT data FROM segmentation_jobs
       WHERE request_hash = $1 AND status NOT IN ('completed', 'failed')
       ORDER BY created_at_ms DESC
       LIMIT 1`,
      [requestHash]
    );
    if (active[0]) return active[0].data;

    const { rows: completed } = await query<{ data: SegmentationJobDocument }>(
      `SELECT data FROM segmentation_jobs
       WHERE request_hash = $1 AND status = 'completed'
       ORDER BY created_at_ms DESC
       LIMIT 1`,
      [requestHash]
    );
    return completed[0]?.data ?? null;
  }

  async verifyUpdateToken(
    jobId: string,
    updateToken: string
  ): Promise<SegmentationJobDocument | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;
    const hash = crypto.createHash('sha256').update(updateToken).digest('hex');
    return hash === job.updateTokenHash ? job : null;
  }

  async deleteJobsByHash(
    requestHash: string,
    options?: { excludeJobId?: string }
  ): Promise<number> {
    const params: unknown[] = [requestHash];
    let sql = `DELETE FROM segmentation_jobs
               WHERE request_hash = $1 AND status != 'completed'`;
    if (options?.excludeJobId) {
      params.push(options.excludeJobId);
      sql += ` AND job_id != $${params.length}`;
    }
    const { rowCount } = await query(sql, params);
    return rowCount;
  }

  async cleanupStaleJobs(
    options?: { limit?: number }
  ): Promise<{ deletedCount: number; scannedCount: number; staleJobIds: string[] }> {
    const now = Date.now();
    const limit = options?.limit ?? 100;
    const { rows } = await query<{ job_id: string }>(
      `SELECT job_id FROM segmentation_jobs
       WHERE stale_at_ms IS NOT NULL AND stale_at_ms < $1
       LIMIT $2`,
      [now, limit]
    );
    const staleJobIds = rows.map((r) => r.job_id);
    if (staleJobIds.length === 0) {
      return { deletedCount: 0, scannedCount: 0, staleJobIds: [] };
    }
    await query(
      'DELETE FROM segmentation_jobs WHERE job_id = ANY($1::text[])',
      [staleJobIds]
    );
    return {
      deletedCount: staleJobIds.length,
      scannedCount: staleJobIds.length,
      staleJobIds,
    };
  }
}
