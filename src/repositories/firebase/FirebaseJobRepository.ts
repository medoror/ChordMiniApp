import type { IJobRepository } from '@/repositories/IJobRepository';
import type { SongContext } from '@/types/chatbotTypes';
import type { SegmentationJobDocument } from '@/services/firebase/segmentationJobService';
import {
  createSegmentationJob,
  getSegmentationJob,
  updateSegmentationJob,
  verifySegmentationJobUpdateToken,
  findActiveSegmentationJobByRequestHash,
  findCompletedSegmentationJobByRequestHash,
  deleteNonCompletedSegmentationJobsByRequestHash,
  cleanupStaleSegmentationJobs,
} from '@/services/firebase/segmentationJobService';

export class FirebaseJobRepository implements IJobRepository {
  async createJob(songContext: SongContext, audioUrl: string): Promise<{ jobId: string; updateToken: string }> {
    const { jobId, updateToken } = await createSegmentationJob(songContext, audioUrl);
    return { jobId, updateToken };
  }

  async getJob(jobId: string): Promise<SegmentationJobDocument | null> {
    return getSegmentationJob(jobId);
  }

  async updateJob(jobId: string, update: Partial<SegmentationJobDocument>): Promise<void> {
    return updateSegmentationJob(jobId, update);
  }

  async findJobByHash(requestHash: string): Promise<SegmentationJobDocument | null> {
    return (
      await findActiveSegmentationJobByRequestHash(requestHash) ??
      await findCompletedSegmentationJobByRequestHash(requestHash)
    );
  }

  async verifyUpdateToken(jobId: string, updateToken: string): Promise<SegmentationJobDocument | null> {
    return verifySegmentationJobUpdateToken(jobId, updateToken);
  }

  async deleteJobsByHash(requestHash: string, options?: { excludeJobId?: string }): Promise<number> {
    return deleteNonCompletedSegmentationJobsByRequestHash(requestHash, options);
  }

  async cleanupStaleJobs(options?: { limit?: number }): Promise<{ deletedCount: number; scannedCount: number; staleJobIds: string[] }> {
    const result = await cleanupStaleSegmentationJobs(options);
    return {
      deletedCount: result.deletedCount ?? 0,
      scannedCount: result.scannedCount ?? 0,
      staleJobIds: result.staleJobIds ?? [],
    };
  }
}
