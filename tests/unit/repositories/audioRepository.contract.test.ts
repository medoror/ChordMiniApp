import type { IAudioRepository } from '@/repositories/IAudioRepository';

export function runAudioRepositoryContractTests(buildRepo: () => IAudioRepository) {
  let repo: IAudioRepository;
  beforeEach(() => { repo = buildRepo(); });

  it('should_return_null_when_metadata_not_found', async () => {
    expect(await repo.getMetadata('notfound')).toBeNull();
  });

  it('should_return_metadata_after_setMetadata', async () => {
    await repo.setMetadata({ videoId: 'abc123', audioUrl: 'https://example.com/a.mp3', title: 'Test Audio' });
    const result = await repo.getMetadata('abc123');
    expect(result).not.toBeNull();
    expect(result!.videoId).toBe('abc123');
  });

  it('should_report_audio_does_not_exist_when_missing', async () => {
    expect(await repo.audioExists('notfound')).toBe(false);
  });
}

describe('IAudioRepository contract suite', () => {
  it('exports the contract runner function', () => {
    expect(typeof runAudioRepositoryContractTests).toBe('function');
  });
});
