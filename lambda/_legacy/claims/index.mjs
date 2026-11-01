// =====================================================================
// CS361 - คำขอเบิก (claim)
//
//   GET  /api/claims   -> คำขอของผู้ใช้ที่ login อยู่
//   POST /api/claims   -> สร้างคำขอ (status = 0 ร่าง)
//        body: { period_id, type_id, section_id, hour, note? }
//
// claimant_id (cognito_sub) ไม่รับจาก body เด็ดขาด
// -> อ่านจาก JWT ที่ API Gateway (Cognito authorizer) ตรวจแล้วเท่านั้น
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

// ---------------------------------------------------------------------
// ผู้ใช้จาก token -> { sub, username, name }
// ---------------------------------------------------------------------
function currentUser(event) {
  const c = event.requestContext?.authorizer?.claims;
  if (!c?.sub) return null;
  const username = c.email ?? c['cognito:username'];
  const name = [c.given_name, c.family_name].filter(Boolean).join(' ') || username;
  return { sub: c.sub, username, name };
}

// claim.claimant_id เป็น FK -> ต้องมีแถวใน app_user ก่อนเสมอ
async function upsertUser(client, u) {
  await client.query(
    `INSERT INTO app_user (cognito_sub, username, name) VALUES ($1, $2, $3)
     ON CONFLICT (cognito_sub) DO UPDATE
       SET username = EXCLUDED.username, name = EXCLUDED.name, synced_at = now()`,
    [u.sub, u.username, u.name],
  );
}

// ---------------------------------------------------------------------
export const handler = async (event) => {
  const user = currentUser(event);
  if (!user) return respond(401, { message: 'ต้อง login ก่อน (method นี้ต้องใช้ Cognito authorizer)' });

  try {
    if (event.httpMethod === 'GET')  return await listClaims(user);
    if (event.httpMethod === 'POST') return await createClaim(user, event.body);
    return respond(405, { message: 'Method not allowed' });
  } catch (err) {
    console.error('DB error:', err.code, err.message);
    return respond(500, { message: 'เกิดข้อผิดพลาดในระบบ' });
  }
};

// ---------------------------------------------------------------------
async function listClaims(user) {
  const { rows } = await pool.query(
    `SELECT c.id, c.status, c.hour, c.note, c.submitted_at, c.created_at,
            co.code AS course_code, co.name_th AS course_name, s.section_no,
            p.month, t.year, t.semester, ct.name AS type_name
       FROM claim c
       JOIN section s            ON s.id  = c.section_id
       JOIN course co            ON co.id = s.course_id
       JOIN claim_period p       ON p.id  = c.period_id
       JOIN academic_term t      ON t.id  = p.term_id
       JOIN compensation_type ct ON ct.id = c.type_id
      WHERE c.claimant_id = $1
      ORDER BY c.created_at DESC`,
    [user.sub],
  );
  return respond(200, rows.map((r) => ({ ...r, hour: Number(r.hour) })));
}

// ---------------------------------------------------------------------
async function createClaim(user, rawBody) {
  let b;
  try { b = JSON.parse(rawBody ?? '{}'); } catch { return respond(400, { message: 'body ต้องเป็น JSON' }); }

  const periodId  = Number(b.period_id);
  const typeId    = Number(b.type_id);
  const sectionId = Number(b.section_id);
  const hour      = Number(b.hour);
  const note      = typeof b.note === 'string' && b.note.trim() ? b.note.trim() : null;

  if (![periodId, typeId, sectionId].every(Number.isInteger) || !(hour > 0)) {
    return respond(400, { message: 'ต้องมี period_id, type_id, section_id (ตัวเลข) และ hour มากกว่า 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await upsertUser(client, user);

    // ต้องเป็นผู้สอน/TA ของ section นั้นจริง
    const staff = await client.query(
      'SELECT 1 FROM section_staff WHERE section_id = $1 AND user_id = $2',
      [sectionId, user.sub],
    );
    if (staff.rowCount === 0) {
      await client.query('ROLLBACK');
      return respond(403, { message: 'คุณไม่ได้เป็นผู้สอนของ section นี้' });
    }

    // รอบต้องเปิดรับอยู่
    const period = await client.query(
      `SELECT 1 FROM claim_period
        WHERE id = $1 AND status = 'OPEN' AND now() BETWEEN open_at AND close_at`,
      [periodId],
    );
    if (period.rowCount === 0) {
      await client.query('ROLLBACK');
      return respond(400, { message: 'รอบนี้ไม่ได้เปิดรับคำขอ' });
    }

    const { rows } = await client.query(
      `INSERT INTO claim (claimant_id, period_id, type_id, section_id, hour, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, claimant_id, period_id, type_id, section_id, hour, note, status, created_at`,
      [user.sub, periodId, typeId, sectionId, hour, note],   // claimant_id = sub จาก token
    );
    await client.query('COMMIT');
    return respond(201, { ...rows[0], hour: Number(rows[0].hour) });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') return respond(400, { message: 'period_id / type_id / section_id ไม่มีอยู่จริง' });
    throw err;
  } finally {
    client.release();
  }
}
