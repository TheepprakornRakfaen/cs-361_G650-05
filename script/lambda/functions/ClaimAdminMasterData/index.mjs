// =====================================================================
// CS361 - Admin Master Data API : จัดการรายวิชา/section และผู้สอนประจำ section
// เฉพาะกลุ่ม ADMIN
//
// API Gateway: resource เดียว /api/admin/{proxy+} (ANY, Cognito authorizer, Lambda proxy)
//
//   GET    /api/admin/users                      -> ผู้ใช้ใน app_user (หน้าผู้ใช้งาน + ให้เลือกเป็นผู้สอน)
//          + staff_roles / section_count จาก section_staff (กลุ่ม Cognito ไม่ได้เก็บใน DB)
//   POST   /api/admin/sections                   -> เพิ่ม section (สร้าง/อัปเดต course ตาม code)
//          { course_code, course_name_th, course_name_en?, term_id, section_no }
//   DELETE /api/admin/sections/{id}              -> ลบ section (ต้องไม่มีคำขอเบิกอ้างถึง)
//   GET    /api/admin/section-staff?section_id=  -> ผู้สอนใน section
//   PUT    /api/admin/section-staff              -> เพิ่ม/แก้ผู้สอน (upsert)
//          { section_id, user_id, role: INSTRUCTOR|TA, max_hour }
//   DELETE /api/admin/section-staff              -> นำผู้สอนออก (ต้องยังไม่มีชั่วโมงที่เบิก)
//          { section_id, user_id }
//
// Environment variables:
//   DATABASE_URL = postgres://claim_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
// =====================================================================
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 3000,
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAFF_ROLES = ['INSTRUCTOR', 'TA'];

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  },
  body: JSON.stringify(body),
});

const getGroups = (claims) => {
  const raw = claims?.['cognito:groups'];
  if (Array.isArray(raw)) return raw;
  return String(raw ?? '')
    .replace(/[\[\]"']/g, '')
    .split(/[,\s]+/)
    .filter(Boolean);
};

const toInt = (v) =>
  Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

const parseBody = (event) => {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(204, {});

  const claims = event.requestContext?.authorizer?.claims;
  if (!claims?.sub) return respond(401, { message: 'ต้องเข้าสู่ระบบก่อน' });
  if (!getGroups(claims).includes('ADMIN')) {
    return respond(403, { message: 'เฉพาะผู้ดูแลระบบ' });
  }

  const body = parseBody(event);
  if (body === null) return respond(400, { message: 'JSON ไม่ถูกต้อง' });

  // proxy = "sections", "sections/12", "section-staff", "users"
  const parts = String(event.pathParameters?.proxy ?? '').split('/').filter(Boolean);
  const route = `${event.httpMethod} ${parts[0] ?? ''}`;

  try {
    switch (route) {
      case 'GET users':             return await listUsers();
      case 'POST sections':         return await createSection(body);
      case 'DELETE sections':       return await deleteSection(parts[1]);
      case 'GET section-staff':     return await listStaff(event.queryStringParameters?.section_id);
      case 'PUT section-staff':     return await upsertStaff(body);
      case 'DELETE section-staff':  return await removeStaff(body);
      default:                      return respond(404, { message: 'ไม่พบ endpoint นี้' });
    }
  } catch (err) {
    console.error('DB error:', err.code, err.message);
    if (err.code === '23505') return respond(409, { message: 'ข้อมูลซ้ำกับที่มีอยู่แล้ว' });
    if (err.code === '23503') return respond(400, { message: 'อ้างอิงข้อมูลที่ไม่มีอยู่' });
    if (err.code === '23514') return respond(400, { message: 'ค่าไม่ผ่านเงื่อนไขของตาราง' });
    return respond(500, { message: 'บันทึกข้อมูลไม่สำเร็จ' });
  }
};

// ---------------------------------------------------------------------
// GET /api/admin/users
// ---------------------------------------------------------------------
async function listUsers() {
  const { rows } = await pool.query(
    `SELECT u.cognito_sub AS user_id,
            u.username,
            u.name,
            u.created_at,
            COALESCE(array_agg(DISTINCT ss.role) FILTER (WHERE ss.role IS NOT NULL), '{}')
                                              AS staff_roles,     -- INSTRUCTOR / TA
            count(DISTINCT ss.section_id)::int AS section_count
       FROM app_user u
       LEFT JOIN section_staff ss ON ss.user_id = u.cognito_sub
      GROUP BY u.cognito_sub
      ORDER BY u.name, u.username`,
  );
  return respond(200, { count: rows.length, users: rows });
}

// ---------------------------------------------------------------------
// POST /api/admin/sections
// ---------------------------------------------------------------------
async function createSection(body) {
  const code = String(body.course_code ?? '').trim().toUpperCase();
  const nameTh = String(body.course_name_th ?? '').trim();
  const nameEn = String(body.course_name_en ?? '').trim() || null;
  const termId = toInt(body.term_id);
  const sectionNo = String(body.section_no ?? '').trim();

  if (!code || !nameTh || !termId || !sectionNo) {
    return respond(400, { message: 'ต้องระบุรหัสวิชา ชื่อวิชา ภาคการศึกษา และกลุ่ม' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const course = await client.query(
      `INSERT INTO course (code, name_th, name_en)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE
         SET name_th = EXCLUDED.name_th,
             name_en = COALESCE(EXCLUDED.name_en, course.name_en)
       RETURNING id`,
      [code, nameTh, nameEn],
    );
    const section = await client.query(
      `INSERT INTO section (course_id, term_id, section_no)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [course.rows[0].id, termId, sectionNo],
    );
    await client.query('COMMIT');
    return respond(201, { section_id: section.rows[0].id, course_id: course.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return respond(409, { message: 'มี section นี้ในภาคการศึกษานี้แล้ว' });
    }
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------
// DELETE /api/admin/sections/{id}
// ---------------------------------------------------------------------
async function deleteSection(rawId) {
  const sectionId = toInt(rawId);
  if (!sectionId) return respond(400, { message: 'section_id ไม่ถูกต้อง' });

  const used = await pool.query('SELECT 1 FROM claim WHERE section_id = $1 LIMIT 1', [sectionId]);
  if (used.rowCount) {
    return respond(409, { message: 'section นี้มีคำขอเบิกแล้ว ลบไม่ได้' });
  }

  // section_staff ลบตามด้วย ON DELETE CASCADE
  const { rowCount } = await pool.query('DELETE FROM section WHERE id = $1', [sectionId]);
  if (!rowCount) return respond(404, { message: 'ไม่พบ section' });
  return respond(200, { deleted: sectionId });
}

// ---------------------------------------------------------------------
// GET /api/admin/section-staff?section_id=
// ---------------------------------------------------------------------
async function listStaff(rawSectionId) {
  const sectionId = rawSectionId ? toInt(rawSectionId) : null;
  if (rawSectionId && !sectionId) return respond(400, { message: 'section_id ไม่ถูกต้อง' });

  const { rows } = await pool.query(
    `SELECT ss.section_id,
            ss.user_id,
            u.username,
            u.name,
            ss.role,
            ss.hour::float     AS hour,
            ss.max_hour::float AS max_hour
       FROM section_staff ss
       JOIN app_user u ON u.cognito_sub = ss.user_id
      WHERE ($1::int IS NULL OR ss.section_id = $1)
      ORDER BY ss.section_id, ss.role, u.name`,
    [sectionId],
  );
  return respond(200, { count: rows.length, staff: rows });
}

// ---------------------------------------------------------------------
// PUT /api/admin/section-staff
// ---------------------------------------------------------------------
async function upsertStaff(body) {
  const sectionId = toInt(body.section_id);
  const userId = String(body.user_id ?? '');
  const role = String(body.role ?? '').toUpperCase();
  const maxHour = Number(body.max_hour);

  if (!sectionId || !UUID_RE.test(userId)) {
    return respond(400, { message: 'ต้องระบุ section และผู้สอน' });
  }
  if (!STAFF_ROLES.includes(role)) {
    return respond(400, { message: 'บทบาทต้องเป็น INSTRUCTOR หรือ TA' });
  }
  if (!Number.isFinite(maxHour) || maxHour < 0 || maxHour > 9999) {
    return respond(400, { message: 'โควตาชั่วโมงไม่ถูกต้อง' });
  }

  // hour (ชั่วโมงที่เบิกไปแล้ว) ไม่ถูกแก้ — โควตาใหม่ต้องไม่น้อยกว่าที่ใช้ไป
  const current = await pool.query(
    'SELECT hour::float AS hour FROM section_staff WHERE section_id = $1 AND user_id = $2::uuid',
    [sectionId, userId],
  );
  const used = current.rows[0]?.hour ?? 0;
  if (maxHour < used) {
    return respond(409, { message: `โควตาต้องไม่น้อยกว่าชั่วโมงที่ใช้ไปแล้ว (${used} ชม.)` });
  }

  const { rows } = await pool.query(
    `INSERT INTO section_staff (section_id, user_id, role, hour, max_hour)
     VALUES ($1, $2::uuid, $3, 0, $4)
     ON CONFLICT (section_id, user_id) DO UPDATE
       SET role = EXCLUDED.role,
           max_hour = EXCLUDED.max_hour
     RETURNING section_id, user_id, role, hour::float AS hour, max_hour::float AS max_hour`,
    [sectionId, userId, role, maxHour],
  );
  return respond(200, { staff: rows[0], created: current.rowCount === 0 });
}

// ---------------------------------------------------------------------
// DELETE /api/admin/section-staff
// ---------------------------------------------------------------------
async function removeStaff(body) {
  const sectionId = toInt(body.section_id);
  const userId = String(body.user_id ?? '');
  if (!sectionId || !UUID_RE.test(userId)) {
    return respond(400, { message: 'ต้องระบุ section และผู้สอน' });
  }

  const { rows } = await pool.query(
    'SELECT hour::float AS hour FROM section_staff WHERE section_id = $1 AND user_id = $2::uuid',
    [sectionId, userId],
  );
  if (!rows.length) return respond(404, { message: 'ไม่พบผู้สอนใน section นี้' });
  if (rows[0].hour > 0) {
    return respond(409, { message: 'ผู้สอนคนนี้มีชั่วโมงที่เบิกแล้ว นำออกไม่ได้' });
  }

  await pool.query(
    'DELETE FROM section_staff WHERE section_id = $1 AND user_id = $2::uuid',
    [sectionId, userId],
  );
  return respond(200, { deleted: { section_id: sectionId, user_id: userId } });
}
