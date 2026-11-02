-- Add Paid status and payment timestamp
BEGIN;

ALTER TABLE claim
  DROP CONSTRAINT IF EXISTS claim_status_check;

ALTER TABLE claim
  ADD CONSTRAINT claim_status_check
  CHECK (status IN (0, 1, 2, 3, 4, 5, 6));

ALTER TABLE claim
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN claim.paid_at
IS 'เวลาที่คำร้องเปลี่ยนสถานะเป็น Paid';

COMMIT;