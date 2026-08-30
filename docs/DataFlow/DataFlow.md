# DataFlow ของระบบ V1

[สถาปัตยกรรมระบบเบื้องต้น](./DataFlow.png)

## 1. Staff/Faculty
ผู้ใช้งานที่เกี่ยวข้อง เช่น อาจารย์ และ TA ผู้ช่วยอาจารย์

## 2. AWS Amplify - Web application host
AWS Amplify ทำหน้าที่ Hosting เว็ปไซต์ รับ Request จากผู้ใช้และส่ง Response ให้ผู้ใช้ เช่น หน้าเว็ปไซต์และไฟล์เอกสารที่จำเป็น

## 3. S3 Bucket - Storage เก็บข้อมูลหน้าเว็ปและไฟล์เอกสาร (Amplify สร้างให้อัตโนมัติ)
S3 Bucket ทำหน้าที่เก็บไฟล์หน้าเว็ปและเอกสารที่จำเป็น โดย Amplify จะค่อยจัดการเมื่อมีการ Build และ Deploy Web application