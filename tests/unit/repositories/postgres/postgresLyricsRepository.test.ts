import type { LyricsData, TranslationData } from '@/repositories/ILyricsRepository';
import { PostgresLyricsRepository } from '@/repositories/postgres/PostgresLyricsRepository';

jest.mock('@/repositories/postgres/db', () => ({ query: jest.fn() }));
import { query } from '@/repositories/postgres/db';
const mockQuery = query as jest.MockedFunction<typeof query>;

const LYRICS: LyricsData = { videoId: 'v1', lyrics: 'Hello world' };
const TRANSLATION: TranslationData & { videoId: string } = {
  videoId: 'v1',
  language: 'es',
  translatedText: 'Hola mundo',
};

describe('PostgresLyricsRepository', () => {
  let repo: PostgresLyricsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PostgresLyricsRepository();
  });

  it('should_return_null_when_lyrics_not_found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.getLyrics('v1')).toBeNull();
  });

  it('should_return_lyrics_on_hit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: LYRICS }], rowCount: 1 });
    const result = await repo.getLyrics('v1');
    expect(result).toEqual(LYRICS);
  });

  it('should_call_upsert_on_setLyrics', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await repo.setLyrics('v1', LYRICS);
    expect(mockQuery.mock.calls[0][0]).toMatch(/INSERT INTO lyrics/);
    expect(mockQuery.mock.calls[0][0]).toMatch(/ON CONFLICT.*DO UPDATE/s);
    expect(mockQuery.mock.calls[0][1]![0]).toBe('v1');
    expect(mockQuery.mock.calls[0][1]![1]).toBe(JSON.stringify(LYRICS));
  });

  it('should_return_null_when_translation_not_found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.getTranslation('cache-key-es')).toBeNull();
  });

  it('should_return_translation_on_hit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ data: TRANSLATION }], rowCount: 1 });
    const result = await repo.getTranslation('cache-key-es');
    expect(result).toEqual(TRANSLATION);
  });

  it('should_call_upsert_on_setTranslation', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await repo.setTranslation('cache-key-es', TRANSLATION);
    expect(mockQuery.mock.calls[0][0]).toMatch(/INSERT INTO translations/);
    expect(mockQuery.mock.calls[0][0]).toMatch(/ON CONFLICT.*DO UPDATE/s);
    expect(mockQuery.mock.calls[0][1]![0]).toBe('cache-key-es');
    expect(mockQuery.mock.calls[0][1]![1]).toBe('v1');
    expect(mockQuery.mock.calls[0][1]![2]).toBe(JSON.stringify(TRANSLATION));
  });
});
