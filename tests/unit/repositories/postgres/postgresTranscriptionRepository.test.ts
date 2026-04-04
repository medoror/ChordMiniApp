import type { TranscriptionData } from '@/repositories/ITranscriptionRepository';
import { PostgresTranscriptionRepository } from '@/repositories/postgres/PostgresTranscriptionRepository';

jest.mock('@/repositories/postgres/db', () => ({ query: jest.fn() }));
import { query } from '@/repositories/postgres/db';
const mockQuery = query as jest.MockedFunction<typeof query>;

const SAMPLE: Omit<TranscriptionData, 'createdAt'> = {
  videoId: 'v1',
  beatModel: 'madmom',
  chordModel: 'chordino',
  beats: [],
  chords: [],
  synchronizedChords: [],
};

describe('PostgresTranscriptionRepository', () => {
  let repo: PostgresTranscriptionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PostgresTranscriptionRepository();
  });

  it('should_return_null_on_cache_miss', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.get('v1', 'madmom', 'chordino')).toBeNull();
  });

  it('should_return_data_on_cache_hit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: SAMPLE }], rowCount: 1 });
    const result = await repo.get('v1', 'madmom', 'chordino');
    expect(result).toEqual(SAMPLE);
  });

  it('should_call_upsert_on_set', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await repo.set(SAMPLE);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toMatch(/INSERT INTO transcriptions/);
  });

  it('should_call_delete_query_on_delete', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await repo.delete('v1', 'madmom', 'chordino');
    expect(mockQuery.mock.calls[0][0]).toMatch(/DELETE FROM transcriptions/);
  });

  it('should_return_false_when_updateEnrichment_row_not_found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.updateEnrichment('v1', 'madmom', 'chordino', { title: 'T' })).toBe(false);
  });

  it('should_return_true_and_merge_when_updateEnrichment_row_exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: SAMPLE }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const result = await repo.updateEnrichment('v1', 'madmom', 'chordino', { title: 'New Title' });
    expect(result).toBe(true);
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[0]).toMatch(/UPDATE transcriptions/);
    const writtenData = JSON.parse(updateCall[1]![3] as string);
    expect(writtenData.title).toBe('New Title');
  });
});
