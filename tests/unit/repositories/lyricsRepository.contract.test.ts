import type { ILyricsRepository, LyricsData } from '@/repositories/ILyricsRepository';

export function runLyricsRepositoryContractTests(buildRepo: () => ILyricsRepository) {
  let repo: ILyricsRepository;
  beforeEach(() => { repo = buildRepo(); });

  it('should_return_null_when_lyrics_not_found', async () => {
    expect(await repo.getLyrics('notfound')).toBeNull();
  });

  it('should_return_lyrics_after_setLyrics', async () => {
    const data: LyricsData = { videoId: 'abc123', lyrics: 'Hello world' };
    await repo.setLyrics('abc123', data);
    const result = await repo.getLyrics('abc123');
    expect(result).not.toBeNull();
    expect(result!.lyrics).toBe('Hello world');
  });

  it('should_return_null_when_translation_not_found', async () => {
    expect(await repo.getTranslation('no-such-key')).toBeNull();
  });

  it('should_return_translation_after_setTranslation', async () => {
    const data = { videoId: 'abc123', language: 'es', translatedText: 'Hola mundo' };
    await repo.setTranslation('cache-key-es-abc', data);
    const result = await repo.getTranslation('cache-key-es-abc');
    expect(result).not.toBeNull();
    expect(result!.language).toBe('es');
  });
}

describe('ILyricsRepository contract suite', () => {
  it('exports the contract runner function', () => {
    expect(typeof runLyricsRepositoryContractTests).toBe('function');
  });
});
