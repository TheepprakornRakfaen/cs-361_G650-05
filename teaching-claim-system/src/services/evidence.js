import {
  getIdToken,
} from "./auth";

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
  const presignResponse =
    await fetch(
      `${API_URL}/api/claims/${encodeURIComponent(
        claimId
      )}/evidence/upload-url`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            token,
        },

        body:
          JSON.stringify({
            fileName:
              file.name,

            contentType,

            fileSize:
              file.size,
          }),
      }
    );

  const presignData =
    await readJson(
      presignResponse
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