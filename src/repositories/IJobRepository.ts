// SongContext lives in @/types/chatbotTypes — not re-exported from segmentationJobService
export type { SegmentationJobDocument as JobRecord, SegmentationJobStatus as JobStatus } from '@/services/firebase/segmentationJobService';
export type { SongContext } from '@/types/chatbotTypes';
import type { SongContext } from '@/types/chatbotTypes';
import type { SegmentationJobDocument } from '@/services/firebase/segmentationJobService';

export interface IJobRepository {
  /** Create a new job. Returns jobId and updateToken. */
  createJob(songContext: SongContext, audioUrl: string): Promise<{ jobId: string; updateToken: string }>;

  /** Fetch a job by ID. Returns null if not found. */
  getJob(jobId: string): Promise<SegmentationJobDocument | null>;

  /** Update job fields. Matches updateSegmentationJob(jobId, updates) signature — no updateToken. */
  updateJob(jobId: string, update: Partial<SegmentationJobDocument>): Promise<void>;

  /**
   * Find an existing job by request hash.
   * Searches both active and completed jobs; returns the most relevant match.
   */
  findJobByHash(requestHash: string): Promise<SegmentationJobDocument | null>;

  /**
   * Verify a job's update token. Returns the job if valid, null if invalid or not found.
   * Used by the SongFormer callback endpoint to authenticate status updates.
   */
  verifyUpdateToken(jobId: string, updateToken: string): Promise<SegmentationJobDocument | null>;

  /**
   * Delete non-completed jobs matching requestHash (used to clean up duplicates).
   * If excludeJobId is provided, that job is preserved.
   * Returns the number of jobs deleted.
   */
  deleteJobsByHash(requestHash: string, options?: { excludeJobId?: string }): Promise<number>;

  /**
   * Delete stale jobs. Returns a result object with deleted count, scanned count, and IDs.
   * Preserving the full shape avoids a breaking change in the cron route's API response.
   */
  cleanupStaleJobs(options?: { limit?: number }): Promise<{ deletedCount: number; scannedCount: number; staleJobIds: string[] }>;
}
