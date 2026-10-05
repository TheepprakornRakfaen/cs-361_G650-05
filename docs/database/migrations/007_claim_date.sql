-- ============================================================
-- CS361 Migration 007 : Claim Date
-- วันสอนของแต่ละคำร้อง (1 claim : N วัน)
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

CREATE TABLE claim_date (
  id          SERIAL PRIMARY KEY,
  claim_id    UUID NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
  teach_date  DATE NOT NULL,
  hour        NUMERIC(5,2) NOT NULL CHECK (hour > 0 AND hour <= 12),
  UNIQUE (claim_id, teach_date)
);
CREATE INDEX idx_claim_date_claim_id ON claim_date (claim_id);

-- คัดลอกวันสอนของคำร้องเดิมไปไว้ที่ claim_date ก่อนลบคอลัมน์
INSERT INTO claim_date (claim_id, teach_date, hour)
SELECT id, teach_date, hour FROM claim;

-- วันสอนย้ายไปเก็บที่ claim_date แทน
ALTER TABLE claim DROP COLUMN teach_date;

COMMIT;
