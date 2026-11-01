# รายละเอียด Endpoint

ทุก endpoint ต้องส่ง `Authorization: <ID token>` ตัวอย่างข้างล่างไม่แสดง header นี้

---

## POST /api/auth/me
Lambda: `me`

บันทึก/อัปเดตผู้ใช้ใน `app_user` จาก claims ของ token แล้วคืนโปรไฟล์ ไม่ต้องมี body

**200**
```json
{
  "cognito_sub": "uuid",
  "username": "teacher01@example.com",
  "name": "ชื่อ นามสกุล",
  "created_at": "2026-09-01T00:00:00.000Z",
  "first_login": false,
  "groups": ["TEACHER"]
}
```
**401** ไม่พบข้อมูลผู้ใช้ใน token

---

## GET /api/term
Lambda: `ClaimsPeriodTermCourses` · ภาคการศึกษาทั้งหมด (ล่าสุดก่อน)

**200**
```json
{ "count": 1, "terms": [
  { "id": 1, "year": 2569, "semester": 1, "label": "1/2569",
    "start_date": "2026-08-10", "end_date": "2026-12-20" } ] }
```
`year` เป็น พ.ศ. ส่วน `start_date`/`end_date` เป็นปี ค.ศ.

## GET /api/period
Lambda: `ClaimsPeriodTermCourses` · รอบยื่นที่เปิดอยู่ตอนนี้

| Query | ความหมาย |
|---|---|
| `term_id` | กรองตามภาคการศึกษา (จำนวนเต็ม ไม่งั้น 400) |
| `all=true` | ทุกรอบ ไม่ว่าเปิดหรือปิด |

**200**
```json
{ "count": 1, "periods": [
  { "id": 3, "term_id": 1, "term_label": "1/2569", "month": 9,
    "open_at": "2026-09-24T17:00:00.000Z", "close_at": "2026-10-25T16:59:59.000Z",
    "status": 1, "is_open_now": true } ] }
```

## GET /api/courses
Lambda: `ClaimsPeriodTermCourses` · section ที่ผู้ใช้เป็นผู้สอน/TA พร้อมชั่วโมง

| Query | ความหมาย |
|---|---|
| `term_id` | กรองตามภาคการศึกษา |
| `all=true` | ทุก section (ไม่กรองตามผู้สอน) ใช้ทดสอบ/เจ้าหน้าที่ |

**200**
```json
{ "count": 1, "courses": [
  { "section_id": 1, "course_code": "CS361", "course_name_th": "...", "course_name_en": "...",
    "section_no": "1", "term_id": 1, "term_label": "1/2569", "role": "INSTRUCTOR",
    "start_time": "09:00:00", "end_time": "12:00:00",
    "hour": 9, "max_hour": 45, "remaining_hour": 36 } ] }
```
หลัง migration 012: `start_time/end_time` หายไป และ `hour/max_hour` มาจาก `section`

---

## GET /api/claims
Lambda: `ClaimUserRequest` · กลุ่ม TEACHER, TA

| Query | ความหมาย |
|---|---|
| (ไม่มี) | คำขอของตัวเอง (รวมแบบร่าง) |
| `scope=review` | คิวตรวจ: ทุกคำขอที่ไม่ใช่ร่าง (เฉพาะ REVIEWER, APPROVER ไม่งั้น 403) |

**200**
```json
{ "count": 1, "claims": [{
  "id": "uuid", "claimant_name": "ชื่อผู้ยื่น", "status": 1,
  "date": [{ "date": "2026-09-05", "hour": 3 }],
  "hour": 3, "rate": 600, "amount": 1800, "note": null,
  "submitted_at": "2026-09-26T03:00:00.000Z", "created_at": "2026-09-26T02:30:00.000Z",
  "section_id": 1, "course_code": "CS361", "course_name": "...", "course_name_en": "...",
  "academic_term": 1, "term": "1/2569", "period_id": 3, "period_month": 9 }] }
```
ไม่ส่ง `claimant_id` (Cognito sub) กลับไป

## POST /api/claims
Lambda: `ClaimUserRequest` · สร้างแบบร่างหรือยื่น

```json
{
  "academic_term": 1,
  "period_id": 3,
  "section_id": 1,
  "status": 1,
  "date": [{ "date": "2026-09-05", "hour": 3 }, { "date": "2026-09-12", "hour": 3 }],
  "note": "ข้อความเพิ่มเติม (ไม่บังคับ)"
}
```
`status`: `0` = ร่าง, `1` = ยื่น (ไม่ส่ง = 0)

**201** `{ "id": "uuid", "status": 1, "submitted_at": "...", "created_at": "...", "hour": 6 }`

| รหัส | สาเหตุ |
|---|---|
| 400 | ข้อมูลไม่ครบ/รูปแบบผิด, ชั่วโมง/วัน ต้อง >0 และ ≤12, วันซ้ำ, วันนอกภาคการศึกษา, รอบไม่เปิด, ภาค/รอบ/section ไม่ตรงกัน, ชั่วโมงเกินที่เหลือ |
| 403 | ไม่ใช่ TEACHER/TA หรือไม่ได้เป็นผู้สอน/TA ของ section |
| 409 | ข้อจำกัดซ้ำในฐานข้อมูล (เช่น ยื่นซ้ำในเดือนเดียวกันตามกฎเดิม) |

## POST /api/claims/{id}/resend
Lambda: `ClaimUserRequest` · แก้คำขอที่ถูกส่งคืน (สถานะ 5) แล้วยื่นใหม่ (กลับเป็น 1)

Body เหมือน `POST /api/claims` (ไม่ต้องมี `status`)

**200** `{ "id": "uuid", "status": 1, "submitted_at": "...", "created_at": "...", "hour": 6 }`
**404** ไม่พบคำขอ (หรือไม่ใช่ของตัวเอง) · **409** ไม่ใช่สถานะ 5 หรือสถานะเปลี่ยนระหว่างทาง

## DELETE /api/claims
Lambda: `ClaimUserRequest` · ลบแบบร่างของตัวเอง

Body `{ "id": "uuid" }` → **200** `{ "id": "uuid", "message": "ลบแบบร่างเรียบร้อยแล้ว" }`
**404** ไม่พบแบบร่าง หรือคำขอไม่ใช่สถานะร่าง

---

## POST /api/claims/{id}/pass | return | approve | reject
Lambda: `ClaimReview`

Body `{ "comment": "ข้อความ" | null }`

| Action | กลุ่ม | จาก → ไป | comment |
|---|---|---|---|
| `pass` | REVIEWER | 1 → 2 | ไม่บังคับ |
| `return` | REVIEWER (จาก 1), APPROVER (จาก 2) | → 5 | **บังคับ** |
| `approve` | APPROVER | 2 → 3 | ไม่บังคับ |
| `reject` | APPROVER | 2 → 4 | **บังคับ** |

**200**
```json
{ "message": "ผ่านการตรวจสอบเรียบร้อย",
  "claim": { "id": "uuid", "status": 2, "return_comment": null, "reviewed_at": "..." } }
```
**403** กลุ่มไม่ถูกต้อง · **400** id ไม่ถูกต้อง หรือขาด comment · **409** ไม่พบคำขอ/สถานะไม่ตรง/เป็นคำขอของตัวเอง

---

## Endpoint ที่ยังไม่มีโค้ดใน repo

| Endpoint | หมายเหตุ |
|---|---|
| `POST /api/claims/{id}/evidence/upload-url` | ขอ presigned PUT URL body `{ fileName, contentType, fileSize, evidenceType }` → คืน `{ uploadUrl, evidenceId, claimId, ... }` หน้าเว็บ `PUT` ไฟล์ไป S3 ตรง (ไม่ใส่ Authorization) แล้วเรียกบันทึกหลักฐาน |
| `POST /api/claims/{id}/evidence` | บันทึกข้อมูลไฟล์หลักฐานหลังอัปโหลดขึ้น S3 (body: `evidence_id`, `object_key`, `file_name`, `content_type`, `file_size`, `evidence_type`) |
| `GET /api/claims/{id}/evidence` | ขอลิงก์อ่านไฟล์ (presigned GET อายุ ~300 วินาที) |
| `POST /api/claims/{id}/actions` | **เส้นที่หน้าเว็บใช้ตรวจ/อนุมัติ** body `{ action: "REVIEW_PASS"\|"APPROVE"\|"REJECT"\|"RETURN", comment }` (comment บังคับกับ REJECT/RETURN) |
| `GET /api/claims/{id}/history`, `GET /api/audit-logs` | ประวัติ (`audit_log`) filters ของ audit-logs: `actor, action, from, to, cursor, limit` → `{ logs, next_cursor }` |
| `POST /api/claims/batch-actions` | V4 ตรวจผ่านเป็นกลุ่ม body `{ "action": "REVIEW_PASS", "claimIds": [...], "comment": "..." }` |
