// =====================================================================
// CS361 - POST /api/auth/me (GRP05-ClaimCRUDUser)
//
// Frontend เรียกทันทีหลัง login สำเร็จ (และเรียกซ้ำได้ทุกครั้งที่เปิดแอป)
//   1) อ่านข้อมูลผู้ใช้จาก JWT ที่ API Gateway (Cognito authorizer) ตรวจแล้ว
//   2) upsert ลง app_user  -> ครั้งแรกสร้างแถวใหม่, ครั้งต่อไปอัปเดตชื่อ/email
//   3) คืนโปรไฟล์ + กลุ่ม (บทบาท) ให้ frontend
//
// ต้องตั้ง Authorization ของ method นี้เป็น Cognito authorizer
// ไม่อย่างนั้น event จะไม่มี claims และจะตอบ 401
//
// Environment variables:
//   DATABASE_URL = postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
// อยู่ใน VPC เดียวกับ RDS (security group: cs361-lambda-sg)
// =====================================================================
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // dev: เข้ารหัสแต่ไม่ตรวจ CA
  max: 1,
  connectionTimeoutMillis: 3000,
});

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  },
  body: JSON.stringify(body),
});

// REST API ส่ง cognito:groups มาเป็น string (เช่น "TEACHER" หรือ "[TEACHER, STAFF]")
// บางกรณีเป็น array -> รองรับทั้งสองแบบ
const parseGroups = (g) => {
  if (!g) return [];
  if (Array.isArray(g)) return g;
  return String(g).replace(/^\[|\]$/g, '').split(/[\s,]+/).filter(Boolean);
};

export const handler = async (event) => {
  const c = event.requestContext?.authorizer?.claims;
  if (!c?.sub) {
    return respond(401, { message: 'ไม่พบข้อมูลผู้ใช้ใน token (method นี้ต้องใช้ Cognito authorizer)' });
  }

  const username = c.email ?? c['cognito:username'];
  const name = [c.given_name, c.family_name].filter(Boolean).join(' ') || username;

  try {
    const { rows } = await pool.query(
      `INSERT INTO app_user (cognito_sub, username, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (cognito_sub) DO UPDATE
         SET username  = EXCLUDED.username,
             name      = EXCLUDED.name,
             synced_at = now()
       RETURNING cognito_sub, username, name, created_at,
                 (xmax = 0) AS first_login`,          // first_login = true: เพิ่งสร้างแถวครั้งนี้
      [c.sub, username, name],
    );

    return respond(200, { ...rows[0], groups: parseGroups(c['cognito:groups']) });
  } catch (err) {
    console.error('DB error:', err.code, err.message);
    return respond(500, { message: 'บันทึกข้อมูลผู้ใช้ไม่สำเร็จ' });
  }
};
