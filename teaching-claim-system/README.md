# ระบบเบิกค่าสอน (Teaching Claim System)

โปรเจกต์ React (Vite + Tailwind CSS) สำหรับหน้าอาจารย์: แดชบอร์ด, งานสอน,
คำขอของฉัน, รายละเอียดคำขอ, และฟอร์มสร้างคำขอ 4 ขั้นตอน

## โครงสร้างโฟลเดอร์

```
teaching-claim-system/
├── index.html                 จุดเริ่มของหน้าเว็บ (HTML shell)
├── package.json                รายชื่อ dependency และคำสั่งรัน/build
├── vite.config.js              ตั้งค่า Vite
├── tailwind.config.js          ตั้งค่า Tailwind CSS
├── postcss.config.js           ตั้งค่า PostCSS (ให้ Tailwind ทำงาน)
├── .gitignore
└── src/
    ├── main.jsx                 mount <App /> เข้ากับ #root
    ├── App.jsx                  Root component: คุมการสลับหน้า (routing แบบ state)
    ├── index.css                Tailwind directives + ฟอนต์ Noto Sans Thai
    ├── theme.js                 สี/โทเค็นดีไซน์ที่ใช้ร่วมกันทั้งแอป
    ├── data/
    │   └── mockData.js          ข้อมูลจำลอง: รายวิชา, รอบการยื่น, คำขอเริ่มต้น
    ├── components/               ชิ้นส่วน UI ที่ใช้ซ้ำได้หลายหน้า
    │   ├── Sidebar.jsx           แถบเมนูด้านข้าง (เมนูภาษาไทย)
    │   ├── Topbar.jsx            แถบด้านบน (ค้นหา, แจ้งเตือน, โปรไฟล์)
    │   ├── SectionCard.jsx       กรอบการ์ดสีขาวมุมโค้งมาตรฐาน
    │   ├── StatusPill.jsx        ป้ายสถานะ (แบบร่าง/รอตรวจสอบ/อนุมัติ/ไม่อนุมัติ)
    │   ├── Toast.jsx             ข้อความแจ้งเตือนมุมขวาล่างหลังยื่นคำขอ
    │   ├── Field.jsx             wrapper ของช่องกรอกฟอร์ม พร้อม label/error
    │   └── SummaryRow.jsx        แถวสรุปข้อมูล label/value ในหน้าตรวจสอบ
    └── pages/                    แต่ละหน้าจอหลักของระบบ (1 ไฟล์ = 1 หน้า)
        ├── Dashboard.jsx         หน้าแดชบอร์ด
        ├── Assignments.jsx       หน้างานสอน/ชั่วโมงคงเหลือต่อวิชา
        ├── MyClaims.jsx          หน้าคำขอของฉัน (ค้นหา/กรอง/ตาราง)
        ├── ClaimDetail.jsx       หน้ารายละเอียดคำขอ + สถานะแบบ stepper
        └── CreateClaim.jsx       ฟอร์มสร้างคำขอ 4 ขั้นตอน
```

**แนวคิดการแบ่งไฟล์:** `pages/` คือหน้าจอที่ผู้ใช้เห็นแต่ละหน้า (ตรงกับเมนูซ้าย
1 หน้า = 1 ไฟล์) ส่วน `components/` คือชิ้นส่วนเล็ก ๆ ที่หลายหน้าเรียกใช้ร่วมกัน
เช่น การ์ด ป้ายสถานะ หัวข้อฟอร์ม เพื่อไม่ให้โค้ดซ้ำ `data/` แยกข้อมูลจำลองออกจาก
UI เพื่อให้ภายหลังสามารถเปลี่ยนไปดึงจาก API จริงได้ง่าย และ `theme.js` เก็บสี
กลางไว้ที่เดียว แก้สีทีเดียวเปลี่ยนทั้งแอป

## วิธีติดตั้งและรัน

ต้องมี [Node.js](https://nodejs.org) เวอร์ชัน 18 ขึ้นไป

```bash
# 1. เข้าโฟลเดอร์โปรเจกต์
cd teaching-claim-system

# 2. ติดตั้ง dependency ทั้งหมด
npm install

# 3. รันเซิร์ฟเวอร์พัฒนา (เปิดที่ http://localhost:5173)
npm run dev

# 4. เมื่อพร้อม deploy ให้ build ไฟล์สำหรับ production
npm run build
```

## จุดที่ควรต่อยอด

- `src/data/mockData.js` ปัจจุบันเป็นข้อมูลจำลอง — เปลี่ยนเป็นเรียก API จริง
  (เช่น `fetch`/`axios`) แล้วส่งผลลัพธ์เข้า state ใน `App.jsx` แทน
- `App.jsx` ใช้ state (`view`) สลับหน้าแบบง่าย ถ้าต้องการ URL ที่กดรีเฟรชแล้ว
  อยู่หน้าเดิมได้ แนะนำเพิ่ม `react-router-dom`
- การอัปโหลดไฟล์ใน `CreateClaim.jsx` เป็น mock (ไม่ได้ส่งขึ้นเซิร์ฟเวอร์จริง)
  ต้องต่อกับ endpoint อัปโหลดไฟล์ของ backend
