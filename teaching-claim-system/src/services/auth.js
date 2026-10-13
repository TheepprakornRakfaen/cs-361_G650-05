import {
  signIn,
  confirmSignIn,
  signOut,
  updatePassword,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
} from "aws-amplify/auth";

import {
  resolveRoles,
  getRoleLabel,
} from "../data/roles";

/*
 * อ่าน user จริงจาก Cognito session
 */
export async function getAuthenticatedUser() {
  const cognitoUser =
    await getCurrentUser();

  const attributes =
    await fetchUserAttributes();

  const session =
    await fetchAuthSession();

  const payload =
    session.tokens?.idToken?.payload || {};

  const groups =
    payload["cognito:groups"] || [];

  const { roles, primary } =
    resolveRoles(groups);

  const email =
    attributes.email ||
    cognitoUser.signInDetails?.loginId ||
    "";

  const firstName =
    attributes.given_name ||
    email.split("@")[0] ||
    cognitoUser.username;

  const fullName = [
    attributes.given_name,
    attributes.family_name,
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * username ใช้ local-part ของ email
   * ชั่วคราว เพื่อให้ mock assignment เดิม
   * เช่น nitcha@tu.ac.th -> nitcha
   * ยังทำงานได้
   */
  const username =
    email.split("@")[0] ||
    cognitoUser.username;

  return {
    username,

    cognitoSub:
      attributes.sub ||
      cognitoUser.userId,

    email,

    name:
      fullName ||
      firstName,

    firstName,

    /*
     * role     = ข้อความภาษาไทยที่แสดงบน UI (ของเดิม)
     * roleKey  = บทบาทหลัก (TEACHER/TA/REVIEWER/APPROVER/ADMIN)
     * roles    = ทุกบทบาทที่ผู้ใช้มี ใช้ตรวจสิทธิ์ใน data/roles.js
     */
    role: getRoleLabel(primary),

    roleKey: primary,

    roles,

    groups,
  };
}

/*
 * Login
 */
export async function loginWithCognito(
  email,
  password
) {
  let result;

  try {
    result =
      await signIn({
        username: email.trim(),
        password,
      });
  } catch (error) {
    /*
     * มี session เก่าค้างในเบราว์เซอร์ (เช่น token หมดอายุ
     * หรือเคยล็อกอินบัญชีอื่นไว้) → ออกจากระบบเดิมก่อน แล้วล็อกอินใหม่
     */
    if (
      error?.name !==
      "UserAlreadyAuthenticatedException"
    ) {
      throw error;
    }

    await signOut();

    result =
      await signIn({
        username: email.trim(),
        password,
      });
  }

  /*
   * กรณีสร้าง user จาก AWS Console
   * Cognito อาจบังคับเปลี่ยน password
   * ตอน login ครั้งแรก
   */
  if (
    result.nextStep?.signInStep ===
    "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
  ) {
    return {
      signedIn: false,
      requiresNewPassword: true,
    };
  }

  if (!result.isSignedIn) {
    return {
      signedIn: false,
      requiresNewPassword: false,
      nextStep:
        result.nextStep,
    };
  }

  const user =
    await getAuthenticatedUser();

  return {
    signedIn: true,
    user,
  };
}

/*
 * ใช้ตอน Cognito บังคับเปลี่ยน password
 */
export async function confirmNewPassword(
  newPassword
) {
  const result =
    await confirmSignIn({
      challengeResponse:
        newPassword,
    });

  if (!result.isSignedIn) {
    return {
      signedIn: false,
      nextStep:
        result.nextStep,
    };
  }

  return {
    signedIn: true,
    user:
      await getAuthenticatedUser(),
  };
}

/*
 * Logout จริงจาก Cognito
 * global = true → เพิกถอน refresh token ทุกอุปกรณ์ (ออกจากระบบทุกที่)
 */
export async function logoutFromCognito(
  { global = false } = {}
) {
  await signOut({ global });
}

/*
 * เปลี่ยนรหัสผ่านขณะล็อกอินอยู่
 */
export async function changePassword(
  oldPassword,
  newPassword
) {
  await updatePassword({
    oldPassword,
    newPassword,
  });
}

/*
 * ลืมรหัสผ่าน: ขั้น 1 ขอรหัสยืนยันทางอีเมล / ขั้น 2 ตั้งรหัสผ่านใหม่
 */
export async function requestPasswordReset(email) {
  await resetPassword({
    username: email.trim(),
  });
}

export async function confirmPasswordReset(
  email,
  code,
  newPassword
) {
  await confirmResetPassword({
    username: email.trim(),
    confirmationCode: code.trim(),
    newPassword,
  });
}

/*
 * แปลง error ของ Cognito เป็นข้อความที่ผู้ใช้เข้าใจ
 * (ไม่เปิดเผยว่ามีบัญชีนี้ในระบบหรือไม่ ตอนขอรีเซ็ตรหัสผ่าน)
 */
export function passwordErrorMessage(error) {
  switch (error?.name) {
    case "NotAuthorizedException":
      return "รหัสผ่านปัจจุบันไม่ถูกต้อง";
    case "InvalidPasswordException":
      return "รหัสผ่านใหม่ไม่ตรงตามเงื่อนไขความปลอดภัย (ควรยาวอย่างน้อย 8 ตัว มีตัวพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และสัญลักษณ์)";
    case "CodeMismatchException":
      return "รหัสยืนยันไม่ถูกต้อง";
    case "ExpiredCodeException":
      return "รหัสยืนยันหมดอายุ กรุณาขอรหัสใหม่";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
    default:
      return "ดำเนินการไม่สำเร็จ กรุณาลองใหม่";
  }
}

/*
 * ใช้ต่อกับ API Gateway ในขั้นถัดไป
 */
export async function getIdToken() {
  const session =
    await fetchAuthSession();

  return (
    session.tokens?.idToken?.toString() ||
    null
  );
}