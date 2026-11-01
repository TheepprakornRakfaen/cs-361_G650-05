# ClaimsUserRequests-evidence (รุ่นเก่า)

รุ่นแรกที่อ่านหลักฐานจาก S3 ตรง ๆ (ไม่มีตาราง `claim_evidence`)

- `evidence.mjs`: `ListObjectsV2` ใต้ `claims/<sub>/` แล้วเซ็น presigned GET ทีละไฟล์ (อายุ `URL_EXPIRES_SEC`, ค่าเริ่ม 300 วินาที)
- `index.mjs`: `GET /api/claims`, `GET /api/claims/{id}/evidence`, `POST /api/claims` ตาม schema เดิม (1 คำขอ 1 วันสอน)
- Env: `DATABASE_URL`, `EVIDENCE_BUCKET`, `URL_EXPIRES_SEC`
- Lambda ใน VPC ต้องมี **S3 Gateway VPC Endpoint** ไม่งั้น `ListObjectsV2` จะ timeout

> รุ่นปัจจุบันที่ใช้ `claim_evidence` (ขอลิงก์อัปโหลด / `POST` บันทึกหลักฐาน / `GET` ขอลิงก์อ่าน) ไม่อยู่ในโฟลเดอร์งาน ไฟล์นี้เก็บไว้เป็นแนวทางเท่านั้น
