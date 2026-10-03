# AWS Service ที่เกี่ยวข้อง
[สถาปัตยกรรมระบบเบื้องต้น](./AWS.png)
## 1. AWS Amplify - การ Hosting web application
AWS Amplify คือบริการ Hosting แบบ Pay as you go นับตามจำนวน Request และ Build/Deploy สำหรับการพัฒนาและควบคุม web application แบบ Full-stack สามารถสร้างเว็ปไชต์ได้อย่างรวดเร็ว มีระบบจัดการ Storage และ backend ให้อัตโนมัติ รับรองการเชื่อมต่อกับฐานข้อมูล และรองรับ framework เช่น react 

เหตุผล : Amplify เป็น Service สามารถเชื่อมกับ Github repository เพื่อทำ CI/CD pipeline ได้โดยไม่ต้องเปลี่ยนแบบ manual โดยตรง เนื่องจาก V1 ยังไม่มีข้อมูลที่ Sensitive และระบบการยื่นยันตัวตนจึงไม่จำที่ต้องใช้ API Gateway และ Cognito 

## 2. S3 Bucket 
S3 Bucket คือบริการ Storage ในการเก็บไฟล์ Object สำหรับการแสดงผลหน้าเว็ปและไฟล์เอกสารทั้งหมด โดยใน V2 S3 Bucket จะจัดเก็บในส่วนเอกสารที่ User แนบมาให้

## 3. Amazon Lambda 
Amazon Lambda คือบริการ Serverless สำหรับการทำงานส่วน compute ซึ่งมีขนาดที่เล็กกว่า โดยจะทำมาใช้ควบคู่กับ RDS ในการ CRUD ฐานข้อมูล และการจัดการไฟล์ใน S3 Bucket

## 4. Amazon Cognito 
Amazon Cognito คือบริการสำหรับการยืนยันตัวตนและการยืนยันสิทธิ์โดยที่ไม่จำเป็นต้องเขียนโค้ดเอง มีความปลอดภัยกว่าและ สามารถบริหารจัดการบัญชีผู้ใช้งานได้โดยตรงผ่าน AWS Console 

## 5. RDS PostgreSQL
RDS PostgreSQL คือฐานข้อมูลแบบ Relational database สำหรับการเก็บฐานข้อมูลภาคการศึกษา รอบเวลายื่นเบิกและตารางที่มีความสัมพันณ์กัน 
เหตุผล : เนื่องจากฐานของมูลที่เกี่ยวข้องกับภาคการศึกษามีตารางที่มีความสัมพันธ์กันซับซ้อน ซึ่ง Relational database สามารถจัดการได้ดีกว่า Non-relational database 

## 6. Amazon API Gateway 
Amazon API Gateway คือบริการสร้าง API สำหรับการเข้าถึงทรัพยากรที่สำคัญ เช่น ฐานข้อมูลที่ผู้ใช้งานยื่นใบคำร้อง

