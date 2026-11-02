-- ============================================================
-- CS361 Migration 003 : เพิ่มสถานะคำร้อง 6 = จ่ายเงินแล้ว
--
--   สถานะคำร้อง (claim.status)
--     0 ร่าง, 1 รอตรวจ, 2 ตรวจแล้วรออนุมัติ, 3 อนุมัติ, 4 ไม่อนุมัติ, 5 ส่งคืนแก้ไข
--     6 จ่ายเงินแล้ว (เปลี่ยนจาก 3 เท่านั้น — สิ้นสุดกระบวนการ)
--
--   ตรงกับหน้าเว็บ (src/data/workflow.js: 6 = Paid)
--   ใช้ได้ทั้ง RDS ที่รัน 001_schema แล้ว และ RDS เดิมที่รัน migration เก่าถึง 017
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

ALTER TABLE claim DROP CONSTRAINT IF EXISTS claim_status_check;

ALTER TABLE claim
  ADD CONSTRAINT claim_status_check
  CHECK (status IN (0, 1, 2, 3, 4, 5, 6));

COMMENT ON COLUMN claim.status IS '0=แบบร่าง 1=รอตรวจ 2=ตรวจแล้วรออนุมัติ 3=อนุมัติ 4=ไม่อนุมัติ 5=ส่งคืนแก้ไข 6=จ่ายเงินแล้ว';

COMMIT;

-- ตรวจผล
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'claim_status_check';
