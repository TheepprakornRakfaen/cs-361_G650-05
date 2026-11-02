import { useEffect, useState } from "react";
import { getClaimHistory } from "../services/api";
import { STATUS, findEscalation } from "../data/workflow";
import { normalizeHistory } from "../components/AuditTimeline";

/*
 * คำขอสถานะ 2 ที่ผู้ตรวจสอบ "ส่งต่อให้ผู้อนุมัติตรวจสอบหลักฐาน"
 * backend ยังไม่มีสถานะแยก จึงอ่านจากประวัติของแต่ละคำขอ (ดู ESCALATE_TAG ใน data/workflow.js)
 * คืน Map(String(claimId) → { comment, actorName, createdAt })
 */
export default function useEscalations(claims = [], enabled = false) {
  const [escalations, setEscalations] = useState(new Map());

  // โหลดใหม่เมื่อชุดคำขอที่รออนุมัติเปลี่ยน (เช่น มีคำขอส่งต่อมาใหม่)
  const reviewedKey = claims
    .filter((c) => c.status === STATUS.REVIEWED)
    .map((c) => `${c.id}|${c.reviewedAt || c.updatedAt || ""}`)
    .join(",");

  useEffect(() => {
    if (!enabled || !reviewedKey) {
      setEscalations(new Map());
      return undefined;
    }

    let active = true;

    Promise.all(
      reviewedKey.split(",").map((entry) => {
        const id = entry.split("|")[0];

        return getClaimHistory(id)
          .then((data) => {
            const rows = Array.isArray(data?.history) ? data.history : Array.isArray(data) ? data : [];
            return [id, findEscalation(rows.map(normalizeHistory))];
          })
          .catch(() => [id, null]);
      })
    ).then((entries) => {
      if (active) setEscalations(new Map(entries.filter(([, e]) => e)));
    });

    return () => {
      active = false;
    };
  }, [enabled, reviewedKey]);

  return escalations;
}
