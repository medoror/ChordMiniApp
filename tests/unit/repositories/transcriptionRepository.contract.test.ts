import type { ITranscriptionRepository, TranscriptionData } from '@/repositories/ITranscriptionRepository';

const SAMPLE: Omit<TranscriptionData, 'createdAt'> = {
  videoId: 'testVideoId1',
  beatModel: 'madmom',
  chordModel: 'chordino',
  beats: [],
  chords: [],
  synchronizedChords: [],
  title: 'Test Video',
};

/**
 * Shared contract — any ITranscriptionRepository implementation must pass this.
 * Import and call this function in implementation-specific test files.
 */
export function runTranscriptionRepositoryContractTests(
  buildRepo: () => ITranscriptionRepository
) {
  let repo: ITranscriptionRepository;
  beforeEach(() => { repo = buildRepo(); });

  it('should_return_null_on_cache_miss', async () => {
    const result = await repo.get('missing', 'madmom', 'chordino');
    expect(result).toBeNull();
  });

  it('should_return_stored_data_after_set', async () => {
    await repo.set(SAMPLE);
    const result = await repo.get(SAMPLE.videoId, SAMPLE.beatModel, SAMPLE.chordModel);
    expect(result).not.toBeNull();
    expect(result!.videoId).toBe(SAMPLE.videoId);
  });

  it('should_treat_different_model_combinations_as_separate_entries', async () => {
    await repo.set(SAMPLE);
    const other = await repo.get(SAMPLE.videoId, 'essentia', 'chordino');
    expect(other).toBeNull();
  });

  it('should_return_null_after_delete', async () => {
    await repo.set(SAMPLE);
    await repo.delete(SAMPLE.videoId, SAMPLE.beatModel, SAMPLE.chordModel);
    const result = await repo.get(SAMPLE.videoId, SAMPLE.beatModel, SAMPLE.chordModel);
    expect(result).toBeNull();
  });
}

// Placeholder so the file is a valid test file now
describe('ITranscriptionRepository contract suite', () => {
  it('exports the contract runner function', () => {
    expect(typeof runTranscriptionRepositoryContractTests).toBe('function');
  });
});
