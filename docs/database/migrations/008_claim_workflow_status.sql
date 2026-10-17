-- ============================================================
-- CS361 Migration 008 : Claim Workflow Status
-- Issue #42 - Secure Approval Workflow
-- 0 = Draft, 1 = submitted, 2 = cancelled, 3 = Returned, 4 = approved
-- ============================================================

BEGIN;

ALTER TABLE claim
ADD COLUMN IF NOT EXISTS return_comment TEXT;

ALTER TABLE claim
  DROP CONSTRAINT IF EXISTS claim_status_check;

ALTER TABLE claim
  ADD CONSTRAINT claim_status_workflow_check
  CHECK (status IN (0, 1, 2, 3, 4));

COMMIT;
