// =====================================================================
// CS361 - Auth API (API Gateway REST, Lambda proxy integration)
//
//   POST /api/login           { email, password }        -> token จาก Cognito
//   POST /api/signup          { email, password }        -> สร้างบัญชี Cognito + ส่งรหัสยืนยันทางอีเมล
//   POST /api/signup/confirm  { email, code }            -> ยืนยันอีเมลด้วยรหัส 6 หลัก
//
// Environment variables:
//   COGNITO_CLIENT_ID = App client id (ไม่มี client secret, เปิด ALLOW_USER_PASSWORD_AUTH)
//   ALLOWED_ORIGIN    = โดเมนของ Amplify เช่น https://main.xxxx.amplifyapp.com
//
// ห้าม log event.body เด็ดขาด เพราะมี password อยู่
// ไม่ต้องอยู่ใน VPC: เรียกแค่ Cognito (public endpoint) ไม่ได้ต่อ RDS
// =====================================================================
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider'; // มีมาให้ใน Lambda runtime Node.js 18+ แล้ว

const cognito = new CognitoIdentityProviderClient({});
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
  },
  body: JSON.stringify(body),
});

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return respond(400, { message: 'รูปแบบข้อมูลไม่ถูกต้อง (ต้องเป็น JSON)' });
  }

  const route = `${event.httpMethod} ${event.resource}`;
  try {
    switch (route) {
      case 'POST /api/login':          return await login(body);
      case 'POST /api/signup':         return await signup(body);
      case 'POST /api/signup/confirm': return await confirmSignup(body);
      default:                         return respond(404, { message: 'ไม่พบ endpoint นี้' });
    }
  } catch (err) {
    return toErrorResponse(err);
  }
};

// ---------------------------------------------------------------------
async function login({ email, password }) {
  if (!isEmail(email) || !password) {
    return respond(400, { message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  const out = await cognito.send(new InitiateAuthCommand({
    ClientId: CLIENT_ID,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email.trim().toLowerCase(), PASSWORD: password },
  }));

  // เช่น ผู้ใช้ที่ admin สร้างให้ ต้องตั้งรหัสผ่านใหม่ก่อน (NEW_PASSWORD_REQUIRED)
  if (out.ChallengeName) {
    return respond(200, { challenge: out.ChallengeName, session: out.Session });
  }

  const r = out.AuthenticationResult;
  return respond(200, {
    idToken: r.IdToken,           // ใช้แนบใน header Authorization ตอนเรียก API อื่น
    accessToken: r.AccessToken,
    refreshToken: r.RefreshToken, // ใช้ขอ token ใหม่ (ทำ endpoint /api/refresh ภายหลัง)
    expiresIn: r.ExpiresIn,       // วินาที
  });
}

// ---------------------------------------------------------------------
async function signup({ email, password }) {
  if (!isEmail(email) || !password) {
    return respond(400, { message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  const out = await cognito.send(new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: email.trim().toLowerCase(),
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email.trim().toLowerCase() }],
  }));

  return respond(201, {
    message: 'สร้างบัญชีแล้ว กรุณากรอกรหัสยืนยันที่ส่งไปทางอีเมล',
    userConfirmed: out.UserConfirmed,
  });
}

// ---------------------------------------------------------------------
async function confirmSignup({ email, code }) {
  if (!isEmail(email) || !code) {
    return respond(400, { message: 'กรุณากรอกอีเมลและรหัสยืนยัน' });
  }

  await cognito.send(new ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    Username: email.trim().toLowerCase(),
    ConfirmationCode: String(code).trim(),
  }));

  return respond(200, { message: 'ยืนยันอีเมลสำเร็จ เข้าสู่ระบบได้แล้ว' });
}

// ---------------------------------------------------------------------
// แปลง error ของ Cognito เป็น HTTP status + ข้อความภาษาไทย
function toErrorResponse(err) {
  switch (err.name) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':   // ตอบเหมือนกัน ไม่บอกว่าอีเมลนี้มีในระบบไหม
      return respond(401, { message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    case 'UserNotConfirmedException':
      return respond(403, { message: 'ยังไม่ได้ยืนยันอีเมล' });
    case 'UserLambdaValidationException': {
      // error ที่ Lambda Pre Token Generation throw ออกมา เช่น ยังไม่ได้ลงทะเบียนในระบบ
      const msg = (err.message ?? '').replace(/^.*failed with error\s*/i, '').replace(/\.$/, '');
      return respond(403, { message: msg || 'ไม่มีสิทธิ์เข้าใช้งาน' });
    }
    case 'UsernameExistsException':
      return respond(409, { message: 'อีเมลนี้มีบัญชีอยู่แล้ว' });
    case 'InvalidPasswordException':
      return respond(400, { message: 'รหัสผ่านไม่ตรงตามเงื่อนไขของระบบ' });
    case 'CodeMismatchException':
      return respond(400, { message: 'รหัสยืนยันไม่ถูกต้อง' });
    case 'ExpiredCodeException':
      return respond(400, { message: 'รหัสยืนยันหมดอายุ' });
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return respond(429, { message: 'ลองใหม่อีกครั้งภายหลัง' });
    default:
      console.error('Unhandled error:', err.name); // log แค่ชื่อ error ไม่ log ข้อมูลผู้ใช้
      return respond(500, { message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}
