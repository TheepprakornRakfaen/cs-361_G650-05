# ClaimsUserRequests

| Method | Route | หน้าที่ | กลุ่มที่เรียกได้ |
|---|---|---|---|
| GET | `/api/claims` | คำขอของตัวเอง | TEACHER, TA |
| GET | `/api/claims?scope=review` | คิวตรวจ (ทุกคำขอที่ไม่ใช่ร่าง) | REVIEWER, APPROVER |
| POST | `/api/claims` | สร้างแบบร่าง (status 0) หรือยื่น (status 1) | TEACHER, TA |
| POST | `/api/claims/{id}/resend` | แก้คำขอที่ถูกส่งคืน (5) แล้วยื่นใหม่ (1) | TEACHER, TA (เจ้าของ) |
| DELETE | `/api/claims` | ลบแบบร่างของตัวเอง body `{ "id": "<uuid>" }` | TEACHER, TA |

- ตาราง: `claim`, `claim_date`, `claim_period`, `section`, `section_staff`, `course`, `academic_term`, `app_user`, `compensation_type`, `class_schedule`
- Env: `DATABASE_URL`
- การตรวจก่อนบันทึก: ภาค/รอบ/section ตรงกัน, รอบเปิดอยู่, วันสอนอยู่ในภาคการศึกษา, เป็นผู้สอนหรือ TA ของ section, ชั่วโมงไม่เกินที่เหลือ, วันไม่ซ้ำ, ชั่วโมง/วัน 0–12
- ข้อความ error ไม่เปิดเผยรายละเอียด DB (ดูใน CloudWatch)

> ⚠️ โค้ดนี้เป็นรุ่นก่อน migration 012 (ชั่วโมงอยู่ที่ `claim_date.hour`, ชั่วโมงเหลืออยู่ที่ `class_schedule`)
> ต้องแก้ให้ใช้ `claim.hour` และ `section.hour/max_hour` พร้อมย้ายการกันวันซ้ำข้ามคำขอมาตรวจใน Lambda ก่อนรัน 012 บน RDS
