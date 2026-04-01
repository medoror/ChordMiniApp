import type { IJobRepository } from '@/repositories/IJobRepository';
import type { SongContext } from '@/types/chatbotTypes';
import type { SegmentationJobDocument } from '@/services/firebase/segmentationJobService';
import {
  createSegmentationJob,
  getSegmentationJob,
  updateSegmentationJob,
  findActiveSegmentationJobByRequestHash,
  findCompletedSegmentationJobByRequestHash,
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
    // Check active jobs first (more likely to be relevant), then completed
    return (
      await findActiveSegmentationJobByRequestHash(requestHash) ??
      await findCompletedSegmentationJobByRequestHash(requestHash)
    );
  }

  async cleanupStaleJobs(): Promise<number> {
    const result = await cleanupStaleSegmentationJobs();
    return result.deletedCount ?? 0;
  }
}
