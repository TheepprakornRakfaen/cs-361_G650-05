import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildNotifications,
  loadReadIds,
  saveReadIds,
  readKey,
} from "../data/notifications";

/*
 * สถานะแจ้งเตือนของผู้ใช้ที่ล็อกอินอยู่
 *  - สร้างรายการจากคำขอ (ของตัวเอง + คิวตามบทบาท) และข่าวสาร
 *  - จำว่าอ่านอะไรแล้วใน localStorage แยกตามผู้ใช้ (ซิงก์ข้ามแท็บ)
 *  - unreadCount คือตัวเลขจุดแดงที่กระดิ่ง: ลดลงทันทีที่ markRead
 */
export default function useNotifications({
  user,
  ownClaims = [],
  queueClaims = [],
}) {
  const username = user?.username || "";

  const [readIds, setReadIds] = useState(() => loadReadIds(username));
  const readRef = useRef(readIds);

  const replaceReadIds = useCallback((ids) => {
    readRef.current = ids;
    setReadIds(ids);
  }, []);

  // เปลี่ยนผู้ใช้ (ล็อกอิน/ออก/สลับบัญชี) → โหลดสถานะอ่านของผู้ใช้นั้น
  useEffect(() => {
    replaceReadIds(username ? loadReadIds(username) : []);
  }, [username, replaceReadIds]);

  // อ่านในแท็บอื่นแล้ว แท็บนี้ต้องเห็นด้วย
  useEffect(() => {
    if (!username) return undefined;

    const onStorage = (event) => {
      if (event.key === readKey(username)) {
        replaceReadIds(loadReadIds(username));
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [username, replaceReadIds]);

  const notifications = useMemo(() => {
    if (!user) return [];

    return buildNotifications({ ownClaims, queueClaims, user }).map((n) => ({
      ...n,
      unread: !n.informational && !readIds.includes(n.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ownClaims, queueClaims, readIds]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications],
  );

  const markRead = useCallback(
    (ids) => {
      if (!username) return;

      const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
      const known = new Set(readRef.current);
      const fresh = list.filter((id) => !known.has(id));

      if (fresh.length === 0) return;

      const next = [...readRef.current, ...fresh];
      replaceReadIds(next);
      saveReadIds(username, next);
    },
    [username, replaceReadIds],
  );

  const markAllRead = useCallback(
    () => markRead(notifications.filter((n) => n.unread).map((n) => n.id)),
    [notifications, markRead],
  );

  // เปิดดูคำขอโดยตรง (ไม่ผ่านหน้าแจ้งเตือน) → แจ้งเตือนของคำขอนั้นถือว่าอ่านแล้ว
  const markClaimRead = useCallback(
    (claimId) =>
      markRead(
        notifications
          .filter((n) => n.claimId === claimId && n.unread)
          .map((n) => n.id),
      ),
    [notifications, markRead],
  );

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    markClaimRead,
  };
}
