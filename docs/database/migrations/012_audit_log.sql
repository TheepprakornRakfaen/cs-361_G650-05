-- ============================================================
-- CS361 Migration 012 : Audit Log & Claim History
-- Issue #44 - Secure Audit Trail
-- Adds a dedicated table without altering existing tables.
-- ============================================================

SET client_encoding = 'UTF8';

BEGIN;

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  claim_id    UUID NOT NULL,
  action      TEXT NOT NULL,
  actor_sub   UUID,
  actor_name  TEXT NOT NULL DEFAULT '',
  actor_role  TEXT NOT NULL DEFAULT '',
  from_status TEXT,
  to_status   TEXT,
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Claim-specific history, newest first
CREATE INDEX idx_audit_log_claim_created
  ON audit_log (claim_id, created_at DESC);

-- Global audit log, newest first
CREATE INDEX idx_audit_log_created
  ON audit_log (created_at DESC);

-- Filter audit events by action
CREATE INDEX idx_audit_log_action
  ON audit_log (action);

COMMIT;
