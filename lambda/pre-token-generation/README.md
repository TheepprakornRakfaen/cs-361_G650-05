# pre-token-generation

Cognito **Pre Token Generation trigger** (event version V1_0) ทำงานทุกครั้งที่ Cognito จะออก token

1. หา `app_user` จาก `cognito_sub` และผูกจาก email ถ้ายังไม่เคยผูก
2. อ่านบทบาทจากตาราง `user_role` ใส่ลง `cognito:groups`
3. ใส่ `app_user_id` ลง ID token (ปฏิเสธถ้าไม่พบผู้ใช้หรือบัญชีถูกปิด)

- Env: `DATABASE_URL`, อยู่ใน VPC เดียวกับ RDS, Cognito รอ trigger ได้ไม่เกิน 5 วินาที
- สถานะ: **ไม่แน่ใจว่ายังผูกกับ User Pool อยู่** โค้ดนี้อ้างตาราง `user_role` ซึ่งถูกแทนที่แล้ว (ตอนนี้ใช้ Cognito Groups และ `app_user` เป็นสำเนาบางส่วน) ตรวจที่ Cognito → User Pool → Lambda triggers
