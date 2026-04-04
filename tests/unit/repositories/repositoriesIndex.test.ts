describe('repositories index', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.STORAGE_BACKEND;
  });

  it('should_throw_for_unknown_backend', async () => {
    process.env.STORAGE_BACKEND = 'unknown-backend';
    const { repositories } = await import('@/repositories');
    expect(() => repositories.transcriptions).toThrow('Unknown STORAGE_BACKEND: "unknown-backend"');
  });

  it('should_not_throw_for_postgres_backend', async () => {
    process.env.STORAGE_BACKEND = 'postgres';
    const { repositories } = await import('@/repositories');
    expect(() => repositories.transcriptions).not.toThrow('Unknown STORAGE_BACKEND');
  });
});
