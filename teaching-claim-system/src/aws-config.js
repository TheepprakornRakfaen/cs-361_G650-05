import { Amplify } from "aws-amplify";
import { DEV_AUTH_BYPASS } from "./services/devAuth";

const userPoolId =
  import.meta.env.VITE_COGNITO_USER_POOL_ID;

const userPoolClientId =
  import.meta.env.VITE_COGNITO_CLIENT_ID;

const missingConfig =
  !userPoolId ||
  !userPoolClientId;

// ตอน dev ยังไม่มีค่า Cognito ก็เปิดเว็บได้ (ใช้โหมดทดลองแทน) — production ยังบังคับเหมือนเดิม
if (missingConfig && !DEV_AUTH_BYPASS) {
  throw new Error(
    "Cognito configuration is missing. Check VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID."
  );
}

if (missingConfig) {
  console.warn(
    "[DEV] ไม่มีค่า Cognito ใน .env.local — ล็อกอินจริงใช้ไม่ได้ ให้ใช้ \"โหมดทดลอง\" ที่หน้าเข้าสู่ระบบ"
  );
} else Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,

      loginWith: {
        email: true,
      },
    },
  },
});