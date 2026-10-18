-- ============================================================
-- CS361 Migration 010 : Claim Review Status
--
-- สถานะคำร้องใหม่ (claim.status)
--   0 = แบบร่าง
--   1 = รอตรวจ
--   2 = ตรวจแล้วรออนุมัติ
--   3 = อนุมัติ
--   4 = ไม่อนุมัติ
--   5 = ส่งคืนแก้ไข
--
-- เลิกใช้สถานะ "ยกเลิก" แล้ว
--
-- แปลงข้อมูลเดิม (จาก 002: 0 ร่าง, 1 ยื่นแล้ว, 2 ยกเลิก)
--   0 → 0,  1 → 1
--   (3 → 5 และ 4 → 3 เผื่อฐานข้อมูลที่เคยใช้สถานะส่งกลับ/อนุมัติแบบเก่า)
--   2 (ยกเลิก) → ลบทิ้ง (claim_date / claim_evidence ลบตามด้วย ON DELETE CASCADE)
--
-- ก่อนรัน ให้ดูว่ามีคำร้องที่ยกเลิกอยู่กี่รายการ (จะถูกลบ):
--   SELECT id, claimant_id, period_id, created_at FROM claim WHERE status = 2;
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

-- index เดิมใช้ "status <> 2" (= ยกเลิก) ซึ่งตอนนี้ 2 แปลว่าตรวจแล้ว → ต้องสร้างใหม่
DROP INDEX IF EXISTS uq_claim_one_per_month;

ALTER TABLE claim DROP CONSTRAINT IF EXISTS claim_status_check;
ALTER TABLE claim DROP CONSTRAINT IF EXISTS claim_status_workflow_check;

DELETE FROM claim WHERE status = 2;

UPDATE claim
   SET status = CASE status
                  WHEN 3 THEN 5   -- ส่งกลับ → ส่งคืนแก้ไข
                  WHEN 4 THEN 3   -- อนุมัติ → อนุมัติ
                END
 WHERE status IN (3, 4);

ALTER TABLE claim
  ADD CONSTRAINT claim_status_check
  CHECK (status IN (0, 1, 2, 3, 4, 5));

COMMENT ON COLUMN claim.status IS
  '0=แบบร่าง 1=รอตรวจ 2=ตรวจแล้วรออนุมัติ 3=อนุมัติ 4=ไม่อนุมัติ 5=ส่งคืนแก้ไข';

-- ยื่นได้เดือนละ 1 คำร้องต่อ section (ไม่มีสถานะยกเลิกแล้ว จึงนับทุกสถานะ)
--   ส่งคืนแก้ไข (5) → แก้คำร้องเดิมแล้วยื่นใหม่
--   ไม่อนุมัติ (4)  → สิ้นสุด ยื่นซ้ำในเดือนเดียวกันไม่ได้
CREATE UNIQUE INDEX uq_claim_one_per_month
  ON claim (claimant_id, section_id, period_id);

COMMIT;
