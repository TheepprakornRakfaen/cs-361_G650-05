import React from "react";
import { Check, Lock } from "lucide-react";

import { C } from "../theme";
import SectionCard from "./SectionCard";
import RoleBadge from "./RoleBadge";
import {
  PERMISSION_META,
  OWN_ONLY_PERMISSIONS,
  ROLE_DESCRIPTION,
  can,
  isClaimant,
} from "../data/roles";

/*
 * [V3] สรุป "บทบาทนี้ทำอะไรได้ / ไม่ได้" ให้ผู้ใช้เห็นของตัวเอง (ใช้ในหน้าโปรไฟล์)
 * ทำให้ผู้ใช้เข้าใจว่าทำไมบางเมนู/ข้อมูลถึงถูกซ่อนหรือแสดงเป็น "จำกัดสิทธิ์"
 */
export default function RoleAccessSummary({ user }) {
  if (!user) return null;

  const primary = user.roleKey || user.roles?.[0];
  const claimant = isClaimant(user);

  const allowed = PERMISSION_META.filter((item) => can(user, item.key));
  const denied = PERMISSION_META.filter((item) => !can(user, item.key));

  return (
    <SectionCard hoverable={false} className="p-5 md:p-6 mt-6">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <h3 className="text-base font-extrabold" style={{ color: C.ink }}>
          สิทธิ์การใช้งานของคุณ
        </h3>
        {primary && <RoleBadge roleKey={primary} />}
      </div>

      {ROLE_DESCRIPTION[primary] && (
        <p className="text-sm leading-6 mb-4" style={{ color: C.sub }}>
          {ROLE_DESCRIPTION[primary]}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: "#1E8E4F" }}>
            ทำได้
          </p>

          <ul className="space-y-1.5">
            {allowed.map((item) => (
              <li
                key={item.key}
                className="flex items-start gap-2 text-sm"
                style={{ color: C.ink }}
              >
                <Check
                  size={15}
                  className="mt-0.5 shrink-0"
                  style={{ color: "#1E8E4F" }}
                />
                <span>
                  {item.label}
                  {claimant && OWN_ONLY_PERMISSIONS.has(item.key) && (
                    <span style={{ color: C.ember }}> (เฉพาะของตนเอง)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold mb-2" style={{ color: C.sub }}>
            ไม่มีสิทธิ์
          </p>

          {denied.length === 0 ? (
            <p className="text-sm" style={{ color: C.sub }}>
              ไม่มี
            </p>
          ) : (
            <ul className="space-y-1.5">
              {denied.map((item) => (
                <li
                  key={item.key}
                  className="flex items-start gap-2 text-sm"
                  style={{ color: C.sub }}
                >
                  <Lock size={14} className="mt-0.5 shrink-0" />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
