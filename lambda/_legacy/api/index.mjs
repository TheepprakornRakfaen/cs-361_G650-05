// =====================================================================
// CS361 - API Lambda (API Gateway REST API, Lambda proxy integration)
//
// Routes (ทุก route ต้องผ่าน Cognito authorizer ก่อน):
//   GET  /me        ข้อมูลผู้ใช้ที่ login + บทบาท
//   GET  /claims    คำร้องของตัวเอง
//   POST /claims    สร้างคำร้องร่าง  body: { "periodId": 1, "typeId": 1, "note": "..." }
//
// ตัวตนผู้ใช้มาจาก token ที่ API Gateway ตรวจแล้ว (claims.sub) เท่านั้น
// ไม่เชื่อ id ผู้ใช้ที่ client ส่งมาใน body
//
// Environment variables:
//   DATABASE_URL   = postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
//   ALLOWED_ORIGIN = https://main.xxxx.amplifyapp.com   (dev ใช้ * ได้)
// =====================================================================
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // dev: เข้ารหัสแต่ไม่ตรวจ CA  (production: ใช้ RDS CA bundle)
  max: 1,
  connectionTimeoutMillis: 3000,
});

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,   // ต้องใส่ทุก response ไม่งั้น browser ขึ้น CORS error
  },
  body: JSON.stringify(body),
});

// หา app_user จาก sub ใน token (อ่าน role จาก DB เสมอ ไม่ใช้ค่าที่ค้างอยู่ใน token)
async function getCurrentUser(client, event) {
  const sub = event.requestContext?.authorizer?.claims?.sub;
  if (!sub) return null;

  const { rows } = await client.query(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
            COALESCE(array_agg(r.code ORDER BY r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
       FROM app_user u
       LEFT JOIN user_role ur ON ur.user_id = u.id
       LEFT JOIN role r       ON r.id = ur.role_id
      WHERE u.cognito_sub = $1 AND u.is_active
      GROUP BY u.id`,
    [sub],
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------
async function getMe(client, user) {
  return json(200, user);
}

async function listMyClaims(client, user) {
  const { rows } = await client.query(
    `SELECT c.id, c.status, c.total_hours, c.note, c.submitted_at, c.created_at,
            t.code AS type_code, t.name AS type_name,
            p.year AS period_year, p.month AS period_month
       FROM claim c
       JOIN compensation_type t ON t.id = c.type_id
       JOIN claim_period      p ON p.id = c.period_id
      WHERE c.claimant_id = $1
      ORDER BY c.created_at DESC`,
    [user.id],
  );
  return json(200, rows);
}

async function createClaim(client, user, event) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { message: 'body ต้องเป็น JSON' });
  }

  const periodId = Number(body.periodId);
  const typeId = Number(body.typeId);
  if (!Number.isInteger(periodId) || !Number.isInteger(typeId)) {
    return json(400, { message: 'ต้องระบุ periodId และ typeId เป็นตัวเลข' });
  }

  // รอบต้องเปิดอยู่
  const period = await client.query(
    `SELECT 1 FROM claim_period
      WHERE id = $1 AND status = 'OPEN' AND now() BETWEEN open_at AND close_at`,
    [periodId],
  );
  if (period.rowCount === 0) {
    return json(400, { message: 'รอบนี้ไม่ได้เปิดรับคำร้อง' });
  }

  // ประเภทต้องใช้งานอยู่
  const type = await client.query(
    'SELECT 1 FROM compensation_type WHERE id = $1 AND is_active',
    [typeId],
  );
  if (type.rowCount === 0) {
    return json(400, { message: 'ไม่พบประเภทการเบิกนี้' });
  }

  try {
    const { rows } = await client.query(
      `INSERT INTO claim (claimant_id, period_id, type_id, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, status, created_at`,
      [user.id, periodId, typeId, body.note ?? null],
    );
    const claim = rows[0];

    await client.query(
      `INSERT INTO claim_status_log (claim_id, from_status, to_status, actor_id)
       VALUES ($1, NULL, 'DRAFT', $2)`,
      [claim.id, user.id],
    );
    return json(201, claim);
  } catch (err) {
    if (err.code === '23505') {   // unique violation (uq_claim_active)
      return json(409, { message: 'มีคำร้องของรอบและประเภทนี้อยู่แล้ว' });
    }
    throw err;
  }
}

// ---------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------
const routes = {
  'GET /me': getMe,
  'GET /claims': listMyClaims,
  'POST /claims': createClaim,
};

export const handler = async (event) => {
  const handlerFn = routes[`${event.httpMethod} ${event.resource}`];
  if (!handlerFn) return json(404, { message: 'Not found' });

  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, event);
    if (!user) return json(403, { message: 'ไม่พบผู้ใช้นี้ในระบบ' });

    return await handlerFn(client, user, event);
  } catch (err) {
    console.error(err);                                   // ดูได้ใน CloudWatch Logs
    return json(500, { message: 'เกิดข้อผิดพลาดในระบบ' }); // ไม่ส่งรายละเอียด error ให้ client
  } finally {
    client.release();
  }
};
