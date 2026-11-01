-- ============================================================
-- CS361 Migration 015 : ประเภทหลักฐาน + ผู้อัปโหลด
--
--   evidence_type : signed_form = เอกสารลงนาม, supporting = หลักฐานประกอบ
--                   (หน้าเว็บส่งมาอยู่แล้วใน POST /api/claims/{id}/evidence)
--   uploaded_by   : cognito_sub ของผู้อัปโหลด (เจ้าของคำร้อง หรือผู้ตรวจที่แนบเอกสารลงนาม)
--
-- ใช้โดย Lambda GRP05-ClaimEvidenceAPI / GRP05-ClaimEvidencePresign
-- ============================================================
SET client_encoding = 'UTF8';

BEGIN;

ALTER TABLE claim_evidence
  ADD COLUMN evidence_type TEXT NOT NULL DEFAULT 'supporting'
    CHECK (evidence_type IN ('signed_form', 'supporting')),
  ADD COLUMN uploaded_by UUID
    REFERENCES app_user(cognito_sub) ON UPDATE CASCADE;

COMMENT ON COLUMN claim_evidence.evidence_type IS 'signed_form = เอกสารลงนาม, supporting = หลักฐานประกอบ';
COMMENT ON COLUMN claim_evidence.uploaded_by   IS 'cognito_sub ของผู้อัปโหลด';

COMMIT;

-- ตรวจผล: \d claim_evidence
