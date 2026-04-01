export interface LyricsData {
  videoId: string;
  lyrics?: string;
  syncedLyrics?: unknown[];
  source?: string;
  [key: string]: unknown;
}

export interface TranslationData {
  videoId?: string;
  language: string;
  translatedText?: string;
  [key: string]: unknown;
}

export interface ILyricsRepository {
  getLyrics(videoId: string): Promise<LyricsData | null>;
  setLyrics(videoId: string, data: LyricsData): Promise<void>;

  /** cacheKey is an opaque string; callers generate it (e.g. hash of content + language). */
  getTranslation(cacheKey: string): Promise<TranslationData | null>;
  setTranslation(cacheKey: string, data: TranslationData & { videoId: string }): Promise<void>;
}
