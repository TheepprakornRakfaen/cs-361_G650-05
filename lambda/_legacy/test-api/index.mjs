// =====================================================================
// CS361 - Test API: GET /test-api/getUser
// ดึงรายชื่อผู้ใช้ทั้งหมดจาก RDS เพื่อทดสอบ API Gateway -> Lambda -> RDS
//
// ⚠️ ไม่มี auth: ใช้ทดสอบเท่านั้น จึงไม่คืน email / phone / cognito_sub
// Environment variables:
//   DATABASE_URL = postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
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
  },
  body: JSON.stringify(body),
});

export const handler = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT id::int, username, first_name, last_name, is_active
         FROM app_user
        ORDER BY id
        LIMIT 50`,
    );
    return respond(200, { count: rows.length, users: rows });
  } catch (err) {
    console.error('DB error:', err.code, err.message);
    return respond(500, { message: 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ', error: err.message });
  }
};
