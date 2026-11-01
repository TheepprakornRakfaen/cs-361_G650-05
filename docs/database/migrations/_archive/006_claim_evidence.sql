-- ============================================================
-- CS361 Migration 006 : Claim Evidence
-- Issue #10 Evidence Management
-- ============================================================

BEGIN;

CREATE TABLE claim_evidence (
  id UUID PRIMARY KEY,

  claim_id UUID NOT NULL
    REFERENCES claim(id)
    ON DELETE CASCADE,

  object_key TEXT NOT NULL UNIQUE,

  file_name TEXT NOT NULL,

  content_type TEXT NOT NULL,

  file_size BIGINT NOT NULL
    CHECK (file_size > 0),

  created_at TIMESTAMPTZ
    NOT NULL DEFAULT now()
);

CREATE INDEX idx_claim_evidence_claim_id
  ON claim_evidence(claim_id);

COMMIT;