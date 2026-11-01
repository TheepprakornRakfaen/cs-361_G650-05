// =====================================================================
// CS361 - GET /api/me  (getUser: ดึงข้อมูลผู้ใช้ที่ login อยู่)
//
// ใช้ทดสอบว่าระบบเชื่อมกันครบ:
//   Cognito (JWT) -> API Gateway (Cognito authorizer) -> Lambda (VPC) -> RDS
//
// API Gateway: REST API, Lambda proxy integration, Authorization = Cognito authorizer
// Lambda     : อยู่ใน VPC เดียวกับ RDS (security group เดียวกับ pre-token-generation)
// Environment variables:
//   DATABASE_URL   = postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
//   ALLOWED_ORIGIN = โดเมนของ Amplify (dev ใช้ * ได้)
// =====================================================================
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // dev: เข้ารหัสแต่ไม่ตรวจ CA (production: ใช้ RDS CA bundle)
  max: 1,
  connectionTimeoutMillis: 3000,
});

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
  },
  body: JSON.stringify(body),
});

// cognito:groups ใน claims ของ REST API มาเป็น string เช่น "TEACHER" หรือ "TEACHER,TA" หรือ "[TEACHER TA]"
const parseGroups = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw).replace(/^\[|\]$/g, '').split(/[,\s]+/).filter(Boolean);
};

export const handler = async (event) => {
  // API Gateway ตรวจ JWT แล้วส่ง claims มาให้ ถ้าไม่มี แปลว่าลืมตั้ง authorizer ที่ method นี้
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims?.sub) {
    return respond(401, { message: 'ไม่พบข้อมูลผู้ใช้ใน token (ตรวจว่า method นี้ตั้ง Cognito authorizer แล้ว)' });
  }

  const client = await pool.connect();
  try {
    // หา user จาก sub ที่ API Gateway ตรวจแล้ว (ห้ามใช้ id จาก query/body ของ client)
    const userResult = await client.query(
      `SELECT id, username, email, phone, first_name, last_name, is_active, created_at
         FROM app_user
        WHERE cognito_sub = $1`,
      [claims.sub],
    );

    if (userResult.rows.length === 0) {
      return respond(404, { message: 'ไม่พบผู้ใช้นี้ในฐานข้อมูล' });
    }

    const u = userResult.rows[0];
    if (!u.is_active) {
      return respond(403, { message: 'บัญชีนี้ถูกปิดการใช้งาน' });
    }

    const roleResult = await client.query(
      `SELECT r.code, r.name
         FROM user_role ur
         JOIN role r ON r.id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY r.code`,
      [u.id],
    );

    const dbRoles = roleResult.rows.map((r) => r.code);
    const tokenGroups = parseGroups(claims['cognito:groups']);

    return respond(200, {
      user: {
        id: Number(u.id),               // BIGINT มาจาก pg เป็น string -> แปลงเป็น number
        username: u.username,
        email: u.email,
        phone: u.phone,
        firstName: u.first_name,
        lastName: u.last_name,
        createdAt: u.created_at,
      },
      roles: roleResult.rows,           // role ปัจจุบันจากฐานข้อมูล (source of truth)

      // ส่วนนี้ไว้ debug ตอนทดสอบ: เทียบค่าที่อยู่ใน token กับฐานข้อมูล
      token: {
        sub: claims.sub,
        appUserId: claims.app_user_id ?? null,
        groups: tokenGroups,
        rolesMatchDatabase:
          [...tokenGroups].sort().join(',') === [...dbRoles].sort().join(','),
      },
    });
  } catch (err) {
    console.error('get-user error:', err.code ?? err.name); // ไม่ log ข้อมูลผู้ใช้
    return respond(500, { message: 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
    client.release();
  }
};
