// =====================================================================
// CS361 - GRP05-ClaimEvidencePresign
//
//   POST /api/claims/{id}/evidence/upload-url
//     Body:     { fileName, contentType, fileSize, evidenceType }
//     Response: { evidenceId, claimId, objectKey, uploadUrl, expiresIn }
//
// ขั้นตอนอัปโหลดหลักฐาน (หน้าเว็บ services/evidence.js)
//   1) เรียก Lambda นี้ -> ได้ presigned PUT URL (ยังไม่บันทึกอะไรใน DB)
//   2) หน้าเว็บ PUT ไฟล์ขึ้น S3 ตรง (ไม่ต้องใส่ Authorization)
//   3) หน้าเว็บเรียก POST /api/claims/{id}/evidence (GRP05-ClaimEvidenceAPI)
//      เพื่อลงทะเบียนไฟล์ลง claim_evidence
//
// Object key: {sub เจ้าของคำร้อง}/{claim_id}/{evidence_id}.{ext}
//   - ใช้ evidence_id (UUID) เป็นชื่อไฟล์ -> ไม่มีปัญหาชื่อไทย/ช่องว่าง/ชื่อซ้ำ
//   - ชื่อไฟล์จริงเก็บใน claim_evidence.file_name ตอนลงทะเบียน
//
// สิทธิ์: เจ้าของคำร้อง (ไม่ใช่สถานะ 4)
//         หรือ REVIEWER / APPROVER / ADMIN กับคำร้องที่ยื่นแล้ว (สถานะ 1,2,3) เช่น เอกสารลงนาม
//
// Environment variables:
//   DATABASE_URL    = postgres://claim_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
//   EVIDENCE_BUCKET = ชื่อ S3 bucket หลักฐาน (private)
//   URL_EXPIRES_SEC = อายุ presigned URL (วินาที) ค่าเริ่มต้น 300
//
// อยู่ใน VPC (ต้องเช็กเจ้าของคำร้องใน RDS)
// การสร้าง presigned URL เซ็นในเครื่อง ไม่ได้เรียก S3 จึงไม่ต้องมี S3 endpoint
// =====================================================================
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (ตรงกับหน้าเว็บ)
const EXT_BY_TYPE = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};
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
  signed_form: {                                  // เอกสารลงนาม (เฉพาะผู้ตรวจ)
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
  const sub = claims?.sub;
  if (!sub) return respond(401, { message: 'ต้องเข้าสู่ระบบก่อน' });
  if (!BUCKET) {
    console.error('EVIDENCE_BUCKET is not set');
    return respond(500, { message: 'ระบบยังไม่ได้ตั้งค่าที่เก็บไฟล์' });
  }

  const claimId = event.pathParameters?.id;
  if (!UUID_RE.test(claimId ?? '')) return respond(400, { message: 'claim id ไม่ถูกต้อง' });

  let body;
  try { body = JSON.parse(event.body ?? '{}') || {}; } catch { return respond(400, { message: 'รูปแบบ JSON ไม่ถูกต้อง' }); }

  const fileName     = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const contentType  = body.contentType;
  const fileSize     = Number(body.fileSize);
  const evidenceType = body.evidenceType ?? 'supporting';

  if (!fileName || fileName.length > 255)
    return respond(400, { message: 'ชื่อไฟล์ไม่ถูกต้อง' });
  if (!EXT_BY_TYPE[contentType])
    return respond(400, { message: 'รองรับเฉพาะ PDF, JPG และ PNG' });
  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE)
    return respond(400, { message: 'ไฟล์ต้องมีขนาดไม่เกิน 10 MB' });
  if (!EVIDENCE_TYPES.includes(evidenceType))
    return respond(400, { message: 'evidenceType ต้องเป็น signed_form หรือ supporting' });

  try {
    const { rows: [claim] } = await pool.query(
      'SELECT claimant_id, status FROM claim WHERE id = $1::uuid',
      [claimId],
    );
    const denied = checkUploadPermission(claims, claim, evidenceType);
    if (denied) return denied;

    // โฟลเดอร์ใช้ sub ของ "เจ้าของคำร้อง" เสมอ แม้ผู้ตรวจเป็นคนอัปโหลด
    // ผู้อัปโหลดจริงบันทึกที่ claim_evidence.uploaded_by
    const evidenceId = randomUUID();
    const objectKey  = `${claim.claimant_id}/${claimId}/${evidenceId}.${EXT_BY_TYPE[contentType]}`;

    // ContentType ถูกเซ็นไว้ -> หน้าเว็บต้อง PUT ด้วย Content-Type เดียวกัน ไม่งั้น S3 ตอบ 403
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET, Key: objectKey, ContentType: contentType }),
      { expiresIn: EXPIRES },
    );

    return respond(200, { evidenceId, claimId, objectKey, uploadUrl, expiresIn: EXPIRES });
  } catch (err) {
    console.error('presign error:', err.code ?? err.name, err.message);
    return respond(500, { message: 'สร้างลิงก์อัปโหลดไม่สำเร็จ กรุณาลองใหม่' });
  }
};
