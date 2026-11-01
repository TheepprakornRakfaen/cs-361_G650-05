# auth-api

| Method | Route | หน้าที่ |
|---|---|---|
| POST | `/api/login` | `{ email, password }` → token จาก Cognito (`USER_PASSWORD_AUTH`) |
| POST | `/api/signup` | `{ email, password }` → สร้างบัญชี Cognito และส่งรหัสยืนยันทางอีเมล |
| POST | `/api/signup/confirm` | `{ email, code }` → ยืนยันอีเมลด้วยรหัส 6 หลัก |

- Env: `COGNITO_CLIENT_ID` (App client ไม่มี secret และเปิด `ALLOW_USER_PASSWORD_AUTH`), `ALLOWED_ORIGIN`
- ไม่ต้องอยู่ใน VPC (เรียกแค่ Cognito) และห้าม log `event.body` เพราะมีรหัสผ่าน
- ใช้ AWS SDK `client-cognito-identity-provider` ที่มีมาใน Lambda runtime อยู่แล้ว จึงไม่ต้องติดตั้งเพิ่ม
- สถานะ: **ไม่แน่ใจว่ายังใช้งานอยู่** หน้าเว็บปัจจุบันล็อกอินผ่าน AWS Amplify (`signIn`) โดยตรง
