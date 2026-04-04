import type { ITranscriptionRepository } from './ITranscriptionRepository';
import type { IAudioRepository } from './IAudioRepository';
import type { IJobRepository } from './IJobRepository';
import type { ILyricsRepository } from './ILyricsRepository';

type Backend = 'firebase' | 'postgres';
const backend = (process.env.STORAGE_BACKEND ?? 'firebase') as Backend;

function createBackend() {
  if (backend === 'firebase') {
    // Dynamic imports keep Firebase SDK out of module-load scope for non-Firebase envs
    const { FirebaseTranscriptionRepository } = require('./firebase/FirebaseTranscriptionRepository');
    const { FirebaseAudioRepository } = require('./firebase/FirebaseAudioRepository');
    const { FirebaseJobRepository } = require('./firebase/FirebaseJobRepository');
    const { FirebaseLyricsRepository } = require('./firebase/FirebaseLyricsRepository');
    return {
      transcriptions: new FirebaseTranscriptionRepository() as ITranscriptionRepository,
      audio: new FirebaseAudioRepository() as IAudioRepository,
      jobs: new FirebaseJobRepository() as IJobRepository,
      lyrics: new FirebaseLyricsRepository() as ILyricsRepository,
    };
  }
  if (backend === 'postgres') {
    const { PostgresTranscriptionRepository } = require('./postgres/PostgresTranscriptionRepository');
    const { PostgresAudioRepository } = require('./postgres/PostgresAudioRepository');
    const { PostgresJobRepository } = require('./postgres/PostgresJobRepository');
    const { PostgresLyricsRepository } = require('./postgres/PostgresLyricsRepository');
    return {
      transcriptions: new PostgresTranscriptionRepository() as ITranscriptionRepository,
      audio: new PostgresAudioRepository() as IAudioRepository,
      jobs: new PostgresJobRepository() as IJobRepository,
      lyrics: new PostgresLyricsRepository() as ILyricsRepository,
    };
  }
  throw new Error(`Unknown STORAGE_BACKEND: "${backend}". Valid values: firebase, postgres`);
}

// Lazily created once on first access
let _repos: ReturnType<typeof createBackend> | null = null;
function getRepos() {
  if (!_repos) _repos = createBackend();
  return _repos;
}

export const repositories = {
  get transcriptions(): ITranscriptionRepository { return getRepos().transcriptions; },
  get audio(): IAudioRepository { return getRepos().audio; },
  get jobs(): IJobRepository { return getRepos().jobs; },
  get lyrics(): ILyricsRepository { return getRepos().lyrics; },
};

/**
 * Test helper — reset the repository singleton (use in beforeEach with jest.resetModules()).
 * Not exported from the public API, only for test use.
 */
export function _resetRepositoriesForTesting() {
  _repos = null;
}
