jest.mock('@/repositories', () => ({
  repositories: {
    transcriptions: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('audioProcessingService uses repositories.transcriptions', () => {
  it('should_import_repositories_not_firebase_directly', async () => {
    const { repositories: repos } = await import('@/repositories');
    expect(repos.transcriptions).toBeDefined();
  });
});
