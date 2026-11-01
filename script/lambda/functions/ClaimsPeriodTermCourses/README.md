# lookup-api

| รายการ | ค่า |
|---|---|
| Route | `GET /api/term`, `GET /api/period`, `GET /api/courses` (Lambda ตัวเดียว แยกตาม `event.resource`) |
| หน้าที่ | ข้อมูลอ้างอิงสำหรับฟอร์มยื่น: ภาคการศึกษา, รอบที่เปิดอยู่, section ที่ผู้ใช้สอน + ชั่วโมงเหลือ |
| ตาราง | `academic_term`, `claim_period`, `section`, `course`, `section_staff` |
| Env | `DATABASE_URL` |

> `getCourses` อ่านโควตาชั่วโมงของผู้ใช้จาก `section_staff.hour / max_hour` (หลัง migration 017) และไม่ส่ง `start_time/end_time` แล้ว
