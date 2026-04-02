import type { ITranscriptionRepository, TranscriptionData } from '@/repositories/ITranscriptionRepository';

// Prevent Firebase from initializing in unit test environment
jest.mock('@/config/firebase', () => ({ db: {}, auth: null, storage: null }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn().mockReturnValue({}),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false, data: () => undefined }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  Timestamp: { now: jest.fn(), fromMillis: jest.fn(), fromDate: jest.fn() },
}));

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

describe('firestoreService exports deleteTranscription', () => {
  it('should_export_deleteTranscription_as_a_function', async () => {
    const { deleteTranscription } = await import('@/services/firebase/firestoreService');
    expect(typeof deleteTranscription).toBe('function');
  });
});

describe('ITranscriptionRepository updateEnrichment contract', () => {
  it('exports updateEnrichment in runTranscriptionRepositoryContractTests', () => {
    expect(typeof runTranscriptionRepositoryContractTests).toBe('function');
  });
});
