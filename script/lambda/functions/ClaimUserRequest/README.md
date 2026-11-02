# ClaimsUserRequests

| Method | Route | หน้าที่ | กลุ่มที่เรียกได้ |
|---|---|---|---|
| GET | `/api/claims` | คำขอของตัวเอง | TEACHER, TA |
| GET | `/api/claims?scope=review` | คิวตรวจ (ทุกคำขอที่ไม่ใช่ร่าง) | REVIEWER, APPROVER |
| POST | `/api/claims` | สร้างแบบร่าง (status 0) หรือยื่น (status 1) | TEACHER, TA |
| POST | `/api/claims/{id}/resend` | แก้คำขอที่ถูกส่งคืน (5) แล้วยื่นใหม่ (1) | TEACHER, TA (เจ้าของ) |
| DELETE | `/api/claims` | ลบแบบร่างของตัวเอง body `{ "id": "<uuid>" }` | TEACHER, TA |

- ตาราง: `claim`, `claim_date`, `claim_period`, `section`, `section_staff`, `course`, `academic_term`, `app_user`, `compensation_type`
- Env: `DATABASE_URL`
- การตรวจก่อนบันทึก: ภาค/รอบ/section ตรงกัน, รอบเปิดอยู่, วันสอนอยู่ในภาคการศึกษา, เป็นผู้สอนหรือ TA ของ section, ชั่วโมงไม่เกินที่เหลือ, วันไม่ซ้ำ, ชั่วโมง/วัน 0–12
- ข้อความ error ไม่เปิดเผยรายละเอียด DB (ดูใน CloudWatch)

> โค้ดนี้เขียนสำหรับ schema หลัง migration 012: ชั่วโมงรวมที่ `claim.hour`, วันสอนที่ `claim_date.teach_date`, โควตาชั่วโมงแยกรายคนที่ `section_staff.hour/max_hour` (ตัวนับ บวกตอนยื่น/ส่งใหม่ ต้องรัน migration 017)
> การกันวันสอนซ้ำข้ามคำขอตรวจใน Lambda (ไม่มี `uq_claim_one_per_month` แล้ว)
