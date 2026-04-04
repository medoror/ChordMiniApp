-- transcriptions: analysis results keyed by (video_id, beat_model, chord_model)
CREATE TABLE IF NOT EXISTS transcriptions (
  video_id    TEXT NOT NULL,
  beat_model  TEXT NOT NULL,
  chord_model TEXT NOT NULL,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (video_id, beat_model, chord_model)
);

-- audio_files: binary audio (bytea) + metadata (jsonb) per video
CREATE TABLE IF NOT EXISTS audio_files (
  video_id    TEXT PRIMARY KEY,
  audio_data  BYTEA,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- segmentation_jobs: job queue with timestamp columns for range queries
CREATE TABLE IF NOT EXISTS segmentation_jobs (
  job_id          TEXT PRIMARY KEY,
  request_hash    TEXT NOT NULL,
  status          TEXT NOT NULL,
  data            JSONB NOT NULL,
  created_at_ms   BIGINT NOT NULL,
  updated_at_ms   BIGINT NOT NULL,
  completed_at_ms BIGINT,
  stale_at_ms     BIGINT
);
CREATE INDEX IF NOT EXISTS idx_segmentation_jobs_request_hash ON segmentation_jobs (request_hash);
CREATE INDEX IF NOT EXISTS idx_segmentation_jobs_status ON segmentation_jobs (status);

-- lyrics: one doc per video
CREATE TABLE IF NOT EXISTS lyrics (
  video_id   TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- translations: keyed by opaque cache_key string
CREATE TABLE IF NOT EXISTS translations (
  cache_key  TEXT PRIMARY KEY,
  video_id   TEXT,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
