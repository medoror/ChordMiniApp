import { PostgresAudioRepository } from '@/repositories/postgres/PostgresAudioRepository';

jest.mock('@/repositories/postgres/db', () => ({ query: jest.fn() }));
import { query } from '@/repositories/postgres/db';
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('PostgresAudioRepository', () => {
  let repo: PostgresAudioRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PostgresAudioRepository();
  });

  it('should_return_null_when_metadata_not_found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.getMetadata('v1')).toBeNull();
  });

  it('should_return_metadata_on_hit', async () => {
    const meta = { videoId: 'v1', audioUrl: 'http://x', title: 'T', isStreamUrl: false };
    mockQuery.mockResolvedValueOnce({ rows: [{ metadata: meta }], rowCount: 1 });
    const result = await repo.getMetadata('v1');
    expect(result).toEqual(meta);
  });

  it('should_call_upsert_on_setMetadata', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await repo.setMetadata({ videoId: 'v1', audioUrl: 'http://x', title: 'T' });
    expect(mockQuery.mock.calls[0][0]).toMatch(/INSERT INTO audio_files/);
  });

  it('should_return_synthetic_url_on_storeAudio', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const url = await repo.storeAudio('v1', new ArrayBuffer(4));
    expect(url).toBe('db://audio/v1');
  });

  it('should_return_false_when_audio_does_not_exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
    expect(await repo.audioExists('v1')).toBe(false);
  });

  it('should_return_true_when_audio_exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });
    expect(await repo.audioExists('v1')).toBe(true);
  });
});
