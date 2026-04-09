// Use require() instead of ESM import to avoid Turbopack's async ESM→CJS
// interop wrapper, which makes this module async and causes constructors in
// the dependent Postgres repository classes to be undefined at call time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg') as typeof import('pg');

if (!process.env.DATABASE_URL && process.env.STORAGE_BACKEND === 'postgres') {
  throw new Error('DATABASE_URL environment variable is required when STORAGE_BACKEND=postgres');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Prevent unhandled error events from crashing the process on idle client failures
pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

/**
 * Execute a parameterized query. Returns rows and rowCount.
 * rowCount is normalized to 0 for SELECT queries (which return null from pg).
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const result = await pool.query(sql, params);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}
