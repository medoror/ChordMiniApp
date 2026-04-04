import type { SegmentationJobDocument } from '@/services/firebase/segmentationJobService';
import { PostgresJobRepository } from '@/repositories/postgres/PostgresJobRepository';

jest.mock('@/repositories/postgres/db', () => ({ query: jest.fn() }));
jest.mock('@/services/firebase/segmentationJobService', () => ({
  buildSegmentationRequestHash: jest.fn().mockReturnValue('hash-abc'),
}));
import { query } from '@/repositories/postgres/db';
const mockQuery = query as jest.MockedFunction<typeof query>;

const SONG_CONTEXT = { videoId: 'v1', title: 'Test Song', uploadId: undefined };

const SAMPLE_JOB: SegmentationJobDocument = {
  jobId: 'seg_1_uuid',
  requestHash: 'hash-abc',
  status: 'created',
  videoId: 'v1',
  audioUrl: 'https://example.com/a.mp3',
  updateTokenHash: 'tokenhash',
  createdAtMs: 1000,
  updatedAtMs: 1000,
};

describe('PostgresJobRepository', () => {
  let repo: PostgresJobRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PostgresJobRepository();
  });

  it('should_return_jobId_and_updateToken_on_createJob', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const result = await repo.createJob(SONG_CONTEXT, 'https://example.com/a.mp3');
    expect(result.jobId).toMatch(/^seg_/);
    expect(typeof result.updateToken).toBe('string');
    expect(result.updateToken.length).toBeGreaterThan(0);
  });

  it('should_return_null_when_job_not_found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.getJob('no-such-job')).toBeNull();
  });

  it('should_return_job_on_hit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: SAMPLE_JOB }], rowCount: 1 });
    const result = await repo.getJob('seg_1_uuid');
    expect(result).toEqual(SAMPLE_JOB);
  });

  it('should_call_update_query_on_updateJob', async () => {
    const beforeUpdate = Date.now();
    mockQuery.mockResolvedValueOnce({ rows: [{ data: SAMPLE_JOB }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await repo.updateJob('seg_1_uuid', { status: 'processing' });
    expect(mockQuery.mock.calls[1][0]).toMatch(/UPDATE segmentation_jobs/);
    const written = JSON.parse(mockQuery.mock.calls[1][1]![1] as string);
    expect(written.status).toBe('processing');
    expect(written.updatedAtMs).toBeGreaterThanOrEqual(beforeUpdate);
  });

  it('should_return_null_when_findJobByHash_finds_nothing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.findJobByHash('hash-xyz')).toBeNull();
  });

  it('should_return_active_job_from_findJobByHash', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: SAMPLE_JOB }], rowCount: 1 });
    const result = await repo.findJobByHash('hash-abc');
    expect(result).toEqual(SAMPLE_JOB);
  });

  it('should_return_null_from_verifyUpdateToken_when_hash_mismatch', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: SAMPLE_JOB }], rowCount: 1 });
    expect(await repo.verifyUpdateToken('seg_1_uuid', 'wrong-token')).toBeNull();
  });

  it('should_return_job_from_verifyUpdateToken_when_hash_matches', async () => {
    const crypto = require('crypto');
    const token = 'my-secret-token';
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const job = { ...SAMPLE_JOB, updateTokenHash: hash };
    mockQuery.mockResolvedValueOnce({ rows: [{ data: job }], rowCount: 1 });
    const result = await repo.verifyUpdateToken('seg_1_uuid', token);
    expect(result).toEqual(job);
  });

  it('should_return_deleted_count_from_deleteJobsByHash', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 3 });
    const count = await repo.deleteJobsByHash('hash-abc');
    expect(count).toBe(3);
    expect(mockQuery.mock.calls[0][0]).toMatch(/DELETE FROM segmentation_jobs/);
  });

  it('should_return_zero_deleted_when_no_stale_jobs', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await repo.cleanupStaleJobs();
    expect(result).toEqual({ deletedCount: 0, scannedCount: 0, staleJobIds: [] });
  });

  it('should_delete_stale_jobs_and_return_result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ job_id: 'j1' }, { job_id: 'j2' }], rowCount: 2 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 2 });
    const result = await repo.cleanupStaleJobs();
    expect(result.deletedCount).toBe(2);
    expect(result.staleJobIds).toEqual(['j1', 'j2']);
  });
});
