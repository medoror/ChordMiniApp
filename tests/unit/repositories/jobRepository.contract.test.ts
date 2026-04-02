import type { IJobRepository } from '@/repositories/IJobRepository';
import type { SongContext } from '@/types/chatbotTypes';

const SONG_CONTEXT: SongContext = {
  videoId: 'testVideoId1',
  title: 'Test Song',
  uploadId: undefined,
};

export function runJobRepositoryContractTests(buildRepo: () => IJobRepository) {
  let repo: IJobRepository;
  beforeEach(() => { repo = buildRepo(); });

  it('should_return_null_when_job_not_found', async () => {
    expect(await repo.getJob('no-such-job')).toBeNull();
  });

  it('should_return_job_after_createJob', async () => {
    const { jobId } = await repo.createJob(SONG_CONTEXT, 'https://example.com/audio.mp3');
    const result = await repo.getJob(jobId);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('created');
    expect(result!.videoId).toBe(SONG_CONTEXT.videoId);
  });

  it('should_return_null_when_hash_not_found', async () => {
    expect(await repo.findJobByHash('no-such-hash')).toBeNull();
  });
}

describe('IJobRepository contract suite', () => {
  it('exports the contract runner function', () => {
    expect(typeof runJobRepositoryContractTests).toBe('function');
  });
});

describe('IJobRepository extended methods contract', () => {
  it('exports the contract runner function', () => {
    expect(typeof runJobRepositoryContractTests).toBe('function');
  });
});
