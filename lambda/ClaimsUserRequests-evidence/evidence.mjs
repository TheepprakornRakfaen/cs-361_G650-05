// =====================================================================
// CS361 - หลักฐานของคำร้อง (อ่านจาก S3 โดยตรง ไม่มีตาราง attachment)
//
// รูปแบบ key ใน bucket:
//   claims/<cognitoSub>/<claimId>/<evidenceId>-<safeFileName>
//
// ทำงาน 2 ขั้น:
//   1) ListObjectsV2 prefix "claims/<sub>/"   -> ได้ไฟล์ทุกคำร้องของผู้ใช้ในครั้งเดียว
//   2) เซ็น presigned GET URL ทีละไฟล์          -> คำนวณในเครื่อง ไม่เรียก S3
//
// ⚠️ Lambda อยู่ใน VPC: ขั้นที่ 1 ต้องมี S3 Gateway VPC Endpoint
//    ไม่อย่างนั้น ListObjectsV2 จะ timeout (เหมือนที่เคยเจอกับ RDS)
//
// Environment variables:
//   EVIDENCE_BUCKET = ชื่อ bucket
//   URL_EXPIRES_SEC = อายุลิงก์ (ไม่ตั้ง = 300 วินาที)
// =====================================================================
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});
const BUCKET = process.env.EVIDENCE_BUCKET;
const EXPIRES = Number(process.env.URL_EXPIRES_SEC ?? 300);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// แยก "<evidenceId>-<safeFileName>"
//   evidenceId เป็น UUID (มี - อยู่ข้างใน) -> ตัด 36 ตัวแรก
//   ถ้าไม่ใช่ UUID                           -> ตัดที่ - ตัวแรก
function splitFileName(name) {
  if (UUID_RE.test(name.slice(0, 36)) && name[36] === '-') {
    return { evidenceId: name.slice(0, 36), fileName: name.slice(37) };
  }
  const i = name.indexOf('-');
  return i > 0
    ? { evidenceId: name.slice(0, i), fileName: name.slice(i + 1) }
    : { evidenceId: name, fileName: name };
}

// อ่าน key ทั้งหมดใต้ prefix (ครั้งละ 1000 ไฟล์ วนจนครบ)
async function listKeys(prefix) {
  const objects = [];
  let ContinuationToken;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken }));
    objects.push(...(res.Contents ?? []));
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return objects;
}

async function toEvidence(obj) {
  // claims/<sub>/<claimId>/<evidenceId>-<safeFileName>
  const [, , claimId, name] = obj.Key.split('/');
  const { evidenceId, fileName } = splitFileName(name);
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: obj.Key,
      // inline = เปิดดูในเบราว์เซอร์ (รูป/PDF) แทนการดาวน์โหลด
      ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    }),
    { expiresIn: EXPIRES },
  );
  return {
    claimId,
    evidence: {
      id: evidenceId,
      file_name: fileName,
      size: obj.Size,
      uploaded_at: obj.LastModified,
      url,                       // ใช้ได้ EXPIRES วินาที
    },
  };
}

// หลักฐานของทุกคำร้องของผู้ใช้ -> Map(claimId => [evidence, ...])
export async function listEvidenceByClaim(cognitoSub) {
  const objects = (await listKeys(`claims/${cognitoSub}/`))
    .filter((o) => o.Key.split('/').length === 4 && !o.Key.endsWith('/'));   // ข้าม "โฟลเดอร์" ว่าง
  const items = await Promise.all(objects.map(toEvidence));

  const map = new Map();
  for (const { claimId, evidence } of items) {
    if (!map.has(claimId)) map.set(claimId, []);
    map.get(claimId).push(evidence);
  }
  for (const list of map.values()) list.sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
  return map;
}

// หลักฐานของคำร้องเดียว
export async function listEvidenceForClaim(cognitoSub, claimId) {
  const objects = (await listKeys(`claims/${cognitoSub}/${claimId}/`)).filter((o) => !o.Key.endsWith('/'));
  return (await Promise.all(objects.map(toEvidence))).map((x) => x.evidence);
}
