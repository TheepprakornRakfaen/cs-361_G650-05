import { getIdToken } from "./auth";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "");

function getContentType(file) {
  if (file.type) {
    return file.type;
  }

  const name =
    file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  if (name.endsWith(".png")) {
    return "image/png";
  }

  return "application/octet-stream";
}

async function readJson(response) {
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

  const token =
    await getIdToken();

  if (!token) {
    throw new Error(
      "NO_AUTH_TOKEN"
    );
  }

  const contentType =
    getContentType(file);

  console.log(
    "Requesting evidence upload URL...",
    {
      claimId,
      fileName: file.name,
      contentType,
      fileSize: file.size,
    }
  );

  /*
   * STEP 1:
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

        body: JSON.stringify({
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

  console.log(
    "Presign response:",
    presignResponse.status,
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
   * STEP 2:
   * Upload File object จริงไป S3
   *
   * ห้ามส่ง Cognito JWT ตรงนี้
   * เพราะ authorization อยู่ใน
   * Presigned URL แล้ว
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

  console.log(
    "S3 upload status:",
    uploadResponse.status
  );

  if (
    !uploadResponse.ok
  ) {
    const text =
      await uploadResponse.text();

    console.error(
      "S3 upload response:",
      text
    );

    throw new Error(
      `S3_UPLOAD_FAILED_${uploadResponse.status}`
    );
  }

  const result = {
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

  console.log(
    "Evidence uploaded successfully:",
    result
  );

  return result;
}