import {
  signIn,
  confirmSignIn,
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
} from "aws-amplify/auth";

/*
 * แปลง Cognito Group
 * ให้เป็น role ที่ UI เดิมใช้
 */
function getRole(groups = []) {
  if (groups.includes("TEACHER")) {
    return "อาจารย์ผู้สอน";
  }

  if (groups.includes("TA")) {
    return "ผู้ช่วยสอน (TA)";
  }

  if (groups.includes("STAFF")) {
    return "เจ้าหน้าที่";
  }

  return "ผู้ใช้งานระบบ";
}

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

    role: getRole(groups),

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
  const result =
    await signIn({
      username: email.trim(),
      password,
    });

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
 */
export async function logoutFromCognito() {
  await signOut();
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