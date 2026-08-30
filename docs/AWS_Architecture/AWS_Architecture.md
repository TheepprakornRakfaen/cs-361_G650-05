# AWS Service ที่เกี่ยวข้อง
[สถาปัตยกรรมระบบเบื้องต้น](./AWS.png)
## 1. AWS Amplify - การ Hosting web application
AWS Amplify คือบริการ Hosting แบบ Pay as you go นับตามจำนวน Request และ Build/Deploy สำหรับการพัฒนาและควบคุม web application แบบ Full-stack สามารถสร้างเว็ปไชต์ได้อย่างรวดเร็ว มีระบบจัดการ Storage และ backend ให้อัตโนมัติ รับรองการเชื่อมต่อกับฐานข้อมูล และรองรับ framework เช่น react 

เหตุผล : Amplify เป็น Service สามารถเชื่อมกับ Github repository เพื่อทำ CI/CD pipeline ได้โดยไม่ต้องเปลี่ยนแบบ manual โดยตรง เนื่องจาก V1 ยังไม่มีข้อมูลที่ Sensitive และระบบการยื่นยันตัวตนจึงไม่จำที่ต้องใช้ API Gateway และ Cognito 

## 2. S3 Bucket (Amplify สร้างให้อัตโนมัติ)
S3 Bucket คือบริการ Storage ในการเก็บไฟล์ Object สำหรับการแสดงผลหน้าเว็ปและไฟล์เอกสารทั้งหมด 

เหตุผล : เนื่องจาก V1 ยังไม่มีข้อมูลที่เป็น Relational จึงยังไม่มีความจำเป็นในการใช้ Database



# AWS Service ทางเลือก 
## 1. Cloudfront + S3
Amazon Cloudfront คือบริการจัดส่งเนื้อหา (Content Delivery Network) ที่ค่อยจัดส่งเนื้อหาเว็ปไซต์ เช่น html css และ javascript โดยสามารถทำได้ทั้งแบบ static และ dynamic โดยใช้ควบคู่กับ S3 bucket เพื่อเก็บเนื้อหาเว็ปไซต์ และต้นทุนแบบ Pay as you go ที่คุ้มค่าที่สุด

เหตุผลที่ไม่เลือกใช้ : เนื่องจากใน Web application มีการใช้ React framework ใยการพัฒนาซึ่ง AMS Amplify สามารถใช้งานร่วมกับ React Router ได้อย่างดี ต่างจาก Cloudfront ที่ต้องตั้งค่าเพิ่มเติม

## 2. EC2
Amazon EC2 คือบริการให้เช่าพื้นที่หน่วยประมวลผลบน Cloud server สามารถเลือกขนาดของหน่วยประมวลผลได้เองและปรับแต่งได้หลากหลาย ผู้ใช้สามารถปรับแต่ง Web server จากหน่วยประมวลผลตามความต้องการได้เอง

เหตุผลที่ไม่เลือกใช้ : Amazon EC2 เป็นบริการที่คิดต้นทุน On-Demand Instances ซึ่งหากต้องการให้มีความ availability จำเป็นต้องเปิด instances ตลอดเวลา จึงมีความคุ้มค่าน้อยกว่า Amplify ในระดับ V1 ที่ยังมี User ที่ไม่แน่นอนและปริมาณไม่เยอะ

## 3. Amazon Lightsail
Amazon Lightsail คือบริการ Virtual Private Server (VPS) แบบสำเร็จรูปของ AWS ที่ออกแบบมาให้ใช้งานง่าย เหมาะกับนักพัฒนาเว็ปไซต์ขนาดเล็กถึงปานกลาง มีความสะดวกและรวดเร็วกว่า EC2 

เหตุผลที่ไม่เลือกใช้ : เนื่องจาก Amazon Lightsail เป็นเหมาะจ่ายแบบรายเดือนจึงยังไม่เหมาะกับโปรเจคในขั้น V1 ที่เป็น web application ขนาดเล็ก