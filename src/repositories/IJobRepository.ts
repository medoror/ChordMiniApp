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

  /** Delete stale jobs. Returns count of deleted jobs. */
  cleanupStaleJobs(): Promise<number>;
}
