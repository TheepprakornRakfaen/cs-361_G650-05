// =====================================================================
// CS361 - GRP05-ClaimEvidenceAPI
//
//   POST /api/claims/{id}/evidence   ลงทะเบียนไฟล์ที่อัปโหลดขึ้น S3 แล้ว -> claim_evidence
//     Body: { evidence_id, object_key, file_name, content_type, file_size, evidence_type }
//     Response 201: { id, claim_id, file_name, content_type, file_size, evidence_type, created_at }
//
//   GET  /api/claims/{id}/evidence   รายการหลักฐาน + ลิงก์เปิดไฟล์ (presigned GET มีอายุ)
//     Response 200: { count, hasEvidence, evidence: [{ id, file_name, content_type, file_size,
//                     evidence_type, created_at, download_url }] }
//
// สิทธิ์
//   POST : เจ้าของคำร้อง (ไม่ใช่สถานะ 4) หรือ REVIEWER / APPROVER / ADMIN กับคำร้องสถานะ 1,2,3
//          (ต้องอัปโหลดผ่าน GRP05-ClaimEvidencePresign มาก่อน)
//   GET  : เจ้าของคำร้อง หรือ REVIEWER / APPROVER / ADMIN (ไม่เห็นร่างของคนอื่น)
//
// ความปลอดภัยตอนลงทะเบียน
//   - object_key ต้องเป็น {sub เจ้าของคำร้อง}/{claim_id}/{evidence_id}.{ext} เท่านั้น
//     -> ลงทะเบียนไฟล์ของคำร้องอื่นไม่ได้  (uploaded_by = คนที่อัปโหลดจริง)
//   - HeadObject ตรวจว่าไฟล์มีอยู่จริงใน S3 และขนาด/ชนิดตรงกับที่แจ้ง
//
// ต้องรัน migration 015 (evidence_type, uploaded_by) ก่อน
//
// Environment variables:
//   DATABASE_URL    = postgres://claim_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
//   EVIDENCE_BUCKET = ชื่อ S3 bucket หลักฐาน (private)
//   URL_EXPIRES_SEC = อายุลิงก์เปิดไฟล์ (วินาที) ค่าเริ่มต้น 300
//
// อยู่ใน VPC และเรียก S3 (HeadObject) -> VPC ต้องมี S3 Gateway Endpoint (ฟรี)
// ไม่อย่างนั้น POST จะค้างจน timeout
// =====================================================================
import pg from 'pg';
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 3000,
});

const s3 = new S3Client({});
const BUCKET = process.env.EVIDENCE_BUCKET;
const EXPIRES = Number(process.env.URL_EXPIRES_SEC) || 300;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const EXT_BY_TYPE = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };
const EVIDENCE_TYPES = ['signed_form', 'supporting']; // เอกสารลงนาม / หลักฐานประกอบ
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  },
  body: JSON.stringify(body),
});

const STAFF_GROUPS = ['REVIEWER', 'APPROVER', 'ADMIN'];
const OWNER_GROUPS = ['TEACHER', 'TA'];

const getGroups = (claims) => {
  const raw = claims?.['cognito:groups'];
  if (Array.isArray(raw)) return raw;
  return String(raw ?? '').replace(/[\[\]"']/g, '').split(/[,\s]+/).filter(Boolean);
};

// ---------------------------------------------------------------------
// กติกา: ประเภทหลักฐาน -> บทบาท -> สถานะคำร้องที่แนบได้
//   สถานะ: 0 ร่าง, 1 รอตรวจ, 2 รออนุมัติ, 3 อนุมัติ, 4 ไม่อนุมัติ, 5 ส่งคืนแก้ไข
//   TEACHER / TA ใช้กับ "คำร้องของตัวเอง" เท่านั้น
//   REVIEWER / APPROVER / ADMIN ใช้กับ "คำร้องของคนอื่น" เท่านั้น
// แก้ตารางนี้ที่เดียวเมื่อต้องการเปลี่ยนสิทธิ์ (Lambda ทั้งสองตัวต้องแก้ให้ตรงกัน)
// ---------------------------------------------------------------------
const UPLOAD_RULES = {
  supporting: {                                   // หลักฐานประกอบการเบิก
    TEACHER:  [0, 1, 2, 3, 5],
    TA:       [0, 1, 2, 3, 5],
  },
  signed_form: {                                  // เอกสารลงนาม
    TEACHER:  [0, 1, 5],                          // ผู้ยื่นแนบตอนร่าง / ยื่น / แก้ไขหลังส่งคืน
    TA:       [0, 1, 5],
    REVIEWER: [1, 2, 3],
  },
};

// คืน null ถ้าแนบได้ หรือ response ที่ปฏิเสธ
const checkUploadPermission = (claims, claim, evidenceType) => {
  if (!claim) return respond(404, { message: 'ไม่พบคำร้องนี้' });

  const isOwner = claim.claimant_id === claims.sub;
  const groups  = getGroups(claims);
  // เจ้าของใช้เฉพาะบทบาทผู้ยื่น, คนอื่นใช้เฉพาะบทบาทผู้ตรวจ
  const scope   = isOwner ? OWNER_GROUPS : STAFF_GROUPS;
  const rule    = UPLOAD_RULES[evidenceType] ?? {};
  const myRoles = groups.filter((g) => scope.includes(g));

  // ไม่ใช่เจ้าของและไม่ใช่ผู้ตรวจ / ผู้ตรวจดูร่างของคนอื่น -> ตอบเหมือนไม่มีคำร้อง
  if (!isOwner && (myRoles.length === 0 || claim.status === 0))
    return respond(404, { message: 'ไม่พบคำร้องนี้' });

  const roleAllowed = myRoles.filter((g) => rule[g]);
  if (roleAllowed.length === 0)
    return respond(403, { message: 'บทบาทของคุณไม่สามารถแนบหลักฐานประเภทนี้ได้' });

  if (!roleAllowed.some((g) => rule[g].includes(claim.status)))
    return respond(409, { message: 'สถานะของคำร้องนี้ไม่สามารถแนบหลักฐานประเภทนี้ได้' });

  return null;
};

export const handler = async (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims?.sub) return respond(401, { message: 'ต้องเข้าสู่ระบบก่อน' });
  if (!BUCKET) {
    console.error('EVIDENCE_BUCKET is not set');
    return respond(500, { message: 'ระบบยังไม่ได้ตั้งค่าที่เก็บไฟล์' });
  }

  const claimId = event.pathParameters?.id;
  if (!UUID_RE.test(claimId ?? '')) return respond(400, { message: 'claim id ไม่ถูกต้อง' });

  try {
    if (event.httpMethod === 'GET')  return await listEvidence(claims, claimId);
    if (event.httpMethod === 'POST') return await registerEvidence(claims, claimId, event.body);
    return respond(405, { message: 'ไม่รองรับ method นี้' });
  } catch (err) {
    console.error('evidence error:', err.code ?? err.name, err.constraint, err.message);
    if (err.code === '23505') return respond(409, { message: 'ไฟล์นี้ลงทะเบียนแล้ว' });
    if (['23503', '23514', '22P02'].includes(err.code))
      return respond(400, { message: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่' });
    return respond(500, { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
  }
};

// ---------------------------------------------------------------------
// GET : รายการหลักฐาน + presigned GET URL
// ---------------------------------------------------------------------
async function listEvidence(claims, claimId) {
  const { rows: [claim] } = await pool.query(
    'SELECT claimant_id, status FROM claim WHERE id = $1::uuid',
    [claimId],
  );

  const isOwner = claim && claim.claimant_id === claims.sub;
  const isStaff = getGroups(claims).some((g) => STAFF_GROUPS.includes(g));
  // คนอื่น / ร่างของคนอื่น -> ตอบ 404 เหมือนไม่มี ไม่บอกว่าคำร้องมีอยู่
  if (!claim || (!isOwner && !(isStaff && claim.status !== 0)))
    return respond(404, { message: 'ไม่พบคำร้องนี้' });

  const { rows } = await pool.query(
    `SELECT id, object_key, file_name, content_type, file_size::int AS file_size,
            evidence_type, created_at
       FROM claim_evidence
      WHERE claim_id = $1::uuid
      ORDER BY created_at`,
    [claimId],
  );

  // เซ็นในเครื่อง ไม่ได้เรียก S3 -> เร็ว ไม่ต้องรอเครือข่าย
  const evidence = await Promise.all(rows.map(async ({ object_key, ...item }) => ({
    ...item,
    download_url: await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: object_key,
        ResponseContentType: item.content_type,
        // inline = เปิดในเบราว์เซอร์ได้, filename* รองรับชื่อไทย
        ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(item.file_name)}`,
      }),
      { expiresIn: EXPIRES },
    ),
  })));

  return respond(200, { count: evidence.length, hasEvidence: evidence.length > 0, evidence });
}

// ---------------------------------------------------------------------
// POST : ลงทะเบียนไฟล์ที่อัปโหลดแล้ว
// ---------------------------------------------------------------------
async function registerEvidence(claims, claimId, rawBody) {
  const sub = claims.sub;
  let body;
  try { body = JSON.parse(rawBody ?? '{}') || {}; } catch { return respond(400, { message: 'รูปแบบ JSON ไม่ถูกต้อง' }); }

  const evidenceId   = body.evidence_id;
  const objectKey    = body.object_key;
  const fileName     = typeof body.file_name === 'string' ? body.file_name.trim() : '';
  const contentType  = body.content_type;
  const fileSize     = Number(body.file_size);
  const evidenceType = body.evidence_type ?? 'supporting';

  if (!UUID_RE.test(evidenceId ?? '')) return respond(400, { message: 'evidence_id ไม่ถูกต้อง' });
  if (!fileName || fileName.length > 255) return respond(400, { message: 'ชื่อไฟล์ไม่ถูกต้อง' });
  if (!EXT_BY_TYPE[contentType]) return respond(400, { message: 'รองรับเฉพาะ PDF, JPG และ PNG' });
  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE)
    return respond(400, { message: 'ไฟล์ต้องมีขนาดไม่เกิน 10 MB' });
  if (!EVIDENCE_TYPES.includes(evidenceType))
    return respond(400, { message: 'evidence_type ต้องเป็น signed_form หรือ supporting' });

  const { rows: [claim] } = await pool.query(
    'SELECT claimant_id, status FROM claim WHERE id = $1::uuid',
    [claimId],
  );
  const denied = checkUploadPermission(claims, claim, evidenceType);
  if (denied) return denied;

  // key ต้องตรงกับที่ ClaimEvidencePresign ออกให้ (โฟลเดอร์ = sub เจ้าของคำร้อง)
  const expectedKey = `${claim.claimant_id}/${claimId}/${evidenceId}.${EXT_BY_TYPE[contentType]}`;
  if (objectKey !== expectedKey) return respond(400, { message: 'object_key ไม่ถูกต้อง' });

  // ไฟล์ต้องอยู่ใน S3 จริง และตรงกับที่แจ้ง
  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: objectKey }));
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404)
      return respond(400, { message: 'ยังไม่พบไฟล์ใน S3 กรุณาอัปโหลดใหม่' });
    throw err;
  }
  if (head.ContentLength !== fileSize || head.ContentType !== contentType)
    return respond(400, { message: 'ไฟล์ใน S3 ไม่ตรงกับข้อมูลที่แจ้ง กรุณาอัปโหลดใหม่' });

  const { rows: [row] } = await pool.query(
    `INSERT INTO claim_evidence
            (id, claim_id, object_key, file_name, content_type, file_size, evidence_type, uploaded_by)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::uuid)
     RETURNING id, claim_id, file_name, content_type, file_size::int AS file_size,
               evidence_type, created_at`,
    [evidenceId, claimId, objectKey, fileName, contentType, fileSize, evidenceType, sub],
  );

  return respond(201, row);
}
