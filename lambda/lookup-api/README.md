# lookup-api

| รายการ | ค่า |
|---|---|
| Route | `GET /api/term`, `GET /api/period`, `GET /api/courses` (Lambda ตัวเดียว แยกตาม `event.resource`) |
| หน้าที่ | ข้อมูลอ้างอิงสำหรับฟอร์มยื่น: ภาคการศึกษา, รอบที่เปิดอยู่, section ที่ผู้ใช้สอน + ชั่วโมงเหลือ |
| ตาราง | `academic_term`, `claim_period`, `section`, `course`, `section_staff`, `class_schedule` |
| Env | `DATABASE_URL` |

> ⚠️ `getCourses` ยังอ่านชั่วโมงจาก `class_schedule` (ก่อน migration 012)
> ต้องแก้เป็น `section.hour / section.max_hour` ก่อนรัน 012 บน RDS
