import {
  getIdToken,
} from "./auth";

import {
  registerClaimEvidence,
} from "./api";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(
    /\/$/,
    ""
  );

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
  ]);

function getContentType(
  file
) {
  if (file.type) {
    return file.type;
  }

  const name =
    file.name.toLowerCase();

  if (
    name.endsWith(".pdf")
  ) {
    return "application/pdf";
  }

  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  if (
    name.endsWith(".png")
  ) {
    return "image/png";
  }

  return "";
}

async function readJson(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}

export async function uploadClaimEvidence(
  claimId,
  file
) {
  if (!API_URL) {
    throw new Error(
      "VITE_API_URL is not configured"
    );
  }

  if (!claimId) {
    throw new Error(
      "CLAIM_ID_REQUIRED"
    );
  }

  if (!file) {
    throw new Error(
      "FILE_REQUIRED"
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      "ไฟล์ต้องมีขนาดไม่เกิน 10 MB"
    );
  }

  const contentType =
    getContentType(file);

  if (
    !ALLOWED_TYPES.has(
      contentType
    )
  ) {
    throw new Error(
      "รองรับเฉพาะ PDF, JPG และ PNG"
    );
  }

  const token =
    await getIdToken();

  if (!token) {
    throw new Error(
      "NO_AUTH_TOKEN"
    );
  }

  /*
   * STEP 1
   * ขอ Presigned URL
   */
  const presignPath =
    `/api/claims/${encodeURIComponent(
      claimId
    )}/evidence/upload-url`;

  const presignBody =
    JSON.stringify({
      fileName:
        file.name,

      contentType,

      fileSize:
        file.size,
    });

  console.log(
    `[API] POST ${presignPath} body:`,
    presignBody
  );

  const presignResponse =
    await fetch(
      `${API_URL}${presignPath}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            token,
        },

        body:
          presignBody,
      }
    );

  const presignData =
    await readJson(
      presignResponse
    );

  console.log(
    `[API] POST ${presignPath} → ${presignResponse.status}`,
    presignData
  );

  if (
    !presignResponse.ok
  ) {
    throw new Error(
      presignData?.message ||
      `Cannot create upload URL (${presignResponse.status})`
    );
  }

  if (
    !presignData?.uploadUrl
  ) {
    throw new Error(
      "Backend did not return uploadUrl"
    );
  }

  /*
   * STEP 2
   * PUT file → S3
   *
   * ห้ามใส่ Cognito Authorization
   * ใน request นี้
   */
  const uploadResponse =
    await fetch(
      presignData.uploadUrl,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            contentType,
        },

        body: file,
      }
    );

  if (
    !uploadResponse.ok
  ) {
    throw new Error(
      `S3_UPLOAD_FAILED_${uploadResponse.status}`
    );
  }

  return {
    evidenceId:
      presignData.evidenceId,

    claimId:
      presignData.claimId ||
      claimId,

    objectKey:
      presignData.objectKey,

    fileName:
      file.name,

    contentType,

    fileSize:
      file.size,

    eTag:
      uploadResponse.headers.get(
        "ETag"
      ),
  };
}

/*
 * อัปโหลดหลายไฟล์ต่อ 1 คำขอ (ทีละไฟล์ตามลำดับ)
 * ไม่หยุดทั้งชุดเมื่อบางไฟล์พลาด — คืน { uploaded, failed } ให้ผู้เรียกแจ้งผู้ใช้
 */
export async function uploadClaimEvidenceFiles(claimId, files = []) {
  const uploaded = [];
  const failed = [];

  for (const file of files) {
    try {
      uploaded.push(await uploadClaimEvidence(claimId, file));
    } catch (error) {
      failed.push({
        fileName: file?.name || "",
        message: error?.message || "อัปโหลดไม่สำเร็จ",
      });
    }
  }

  return { uploaded, failed };
}

/*
 * อัปโหลดไป S3 + บันทึก metadata ลงฐานข้อมูล "ทีละไฟล์" และไม่หยุดทั้งชุดเมื่อบางไฟล์พลาด
 *
 * ต้อง register ทุกไฟล์ที่ขึ้น S3 สำเร็จเสมอ ไม่เช่นนั้นไฟล์จะอยู่ใน bucket
 * แต่หน้ารายละเอียดคำขอมองไม่เห็น (GET /evidence อ่านจาก metadata ในฐานข้อมูล)
 *
 * entries: File หรือรายการที่ล้มเหลวจากรอบก่อน ({ file, uploaded })
 *   - ถ้ารอบก่อนอัปโหลดขึ้น S3 แล้วแต่ register พลาด → รอบนี้ register ซ้ำอย่างเดียว ไม่อัปโหลดซ้ำ
 *
 * คืน { registered: [evidence], failed: [{ file, fileName, message, stage, uploaded }] }
 * failed เก็บ File ไว้ เพื่อให้ผู้ใช้กด "ลองอีกครั้ง" ได้โดยไม่ต้องเลือกไฟล์ใหม่
 */
export async function uploadAndRegisterEvidence(claimId, entries = []) {
  // อัปโหลดทุกไฟล์พร้อมกัน (ไม่รอทีละไฟล์) แล้วเรียงผลตามลำดับเดิม
  const results = await Promise.all(
    entries.map(async (entry) => {
      const file = entry instanceof File ? entry : entry?.file;
      let uploaded = entry instanceof File ? null : entry?.uploaded || null;
      let stage = "upload";

      try {
        if (!uploaded) {
          uploaded = await uploadClaimEvidence(claimId, file);
        }

        stage = "register";

        await registerClaimEvidence(claimId, uploaded);

        return { ok: true, uploaded };
      } catch (error) {
        return {
          ok: false,
          failed: {
            file,
            fileName: file?.name || uploaded?.fileName || "",
            stage,
            uploaded: stage === "register" ? uploaded : null,
            message:
              error?.data?.message ||
              error?.message ||
              (stage === "register"
                ? "บันทึกข้อมูลไฟล์ไม่สำเร็จ"
                : "อัปโหลดไม่สำเร็จ"),
          },
        };
      }
    })
  );

  return {
    registered: results.filter((r) => r.ok).map((r) => r.uploaded),
    failed: results.filter((r) => !r.ok).map((r) => r.failed),
  };
}
