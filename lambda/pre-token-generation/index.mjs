// =====================================================================
// CS361 - Cognito Pre Token Generation trigger (event version V1_0)
//
// ทำงานทุกครั้งที่ Cognito กำลังจะออก token (login / refresh / เปลี่ยนรหัสครั้งแรก)
//   1) หา app_user จาก cognito_sub
//   2) ถ้ายังไม่เคยผูก -> ผูกจาก email (ต้อง verified และแถวนั้นยังไม่ถูกผูกกับใคร)
//   3) อ่านบทบาทจาก user_role แล้วใส่ลง cognito:groups ใน ID + access token
//   4) ใส่ app_user_id ลง ID token ให้ frontend ใช้
//   ถ้าไม่พบผู้ใช้ในฐานข้อมูล หรือบัญชีถูกปิด -> ปฏิเสธการ login
//
// Environment variables:
//   DATABASE_URL = postgres://claims_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/claims
// =====================================================================
import pg from 'pg';

// สร้าง pool นอก handler เพื่อใช้ connection ซ้ำระหว่าง invocation
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // dev: เข้ารหัสแต่ไม่ตรวจ CA  (production: ใช้ RDS CA bundle)
  max: 1,
  connectionTimeoutMillis: 3000,      // Cognito รอ trigger ได้ไม่เกิน 5 วินาที
});

export const handler = async (event) => {
  const { sub, email, email_verified } = event.request.userAttributes;

  const client = await pool.connect();
  try {
    // 1) เคยผูกแล้ว
    let { rows } = await client.query(
      'SELECT id, is_active FROM app_user WHERE cognito_sub = $1',
      [sub],
    );

    // 2) ยังไม่เคยผูก -> ผูกด้วย email (เฉพาะ email ที่ยืนยันแล้ว กันคนสมัครด้วย email คนอื่น)
    if (rows.length === 0 && email && email_verified === 'true') {
      ({ rows } = await client.query(
        `UPDATE app_user
            SET cognito_sub = $1, updated_at = now()
          WHERE lower(email) = lower($2)
            AND cognito_sub IS NULL
        RETURNING id, is_active`,
        [sub, email],
      ));
    }

    if (rows.length === 0 || !rows[0].is_active) {
      // throw = Cognito ปฏิเสธการออก token ผู้ใช้จะ login ไม่ผ่าน
      throw new Error('บัญชีนี้ยังไม่ได้ลงทะเบียนในระบบ กรุณาติดต่อเจ้าหน้าที่');
    }

    const appUserId = rows[0].id;

    // 3) บทบาทจากฐานข้อมูล (source of truth)
    const roleResult = await client.query(
      `SELECT r.code
         FROM user_role ur
         JOIN role r ON r.id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY r.code`,
      [appUserId],
    );

    event.response = {
      claimsOverrideDetails: {
        claimsToAddOrOverride: { app_user_id: String(appUserId) },   // ID token เท่านั้น
        groupOverrideDetails: {
          groupsToOverride: roleResult.rows.map((r) => r.code),     // ID + access token
        },
      },
    };
    return event;
  } finally {
    client.release();
  }
};
