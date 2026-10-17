import React from "react";
import { ShieldCheck, Check, Minus, Info, UserCheck } from "lucide-react";

import { C } from "../theme";
import SectionCard from "../components/SectionCard";
import PageHeader from "../components/PageHeader";
import RoleBadge from "../components/RoleBadge";
import {
  ROLE,
  ROLE_META,
  ROLE_DESCRIPTION,
  ROLE_PERMISSIONS,
  PERMISSION_META,
  OWN_ONLY_PERMISSIONS,
  PERMISSION as P,
} from "../data/roles";

const ROLE_COLUMNS = [
  ROLE.TEACHER,
  ROLE.TA,
  ROLE.REVIEWER,
  ROLE.APPROVER,
  ROLE.ADMIN,
];

const isClaimantRole = (role) =>
  ROLE_PERMISSIONS[role]?.includes(P.CLAIM_CREATE);

/*
 * ค่าในแต่ละช่อง: "yes" | "own" (เฉพาะของตนเอง) | "no"
 * ผู้ยื่นเห็นการเงิน/เอกสาร/ประวัติได้เฉพาะคำขอของตัวเอง
 */
function cellState(role, permission) {
  if (!ROLE_PERMISSIONS[role]?.includes(permission)) return "no";

  return isClaimantRole(role) && OWN_ONLY_PERMISSIONS.has(permission)
    ? "own"
    : "yes";
}

function Cell({ state }) {
  if (state === "no") {
    return (
      <span
        className="inline-flex items-center justify-center"
        style={{ color: "#B6C0CA" }}
        aria-label="ไม่มีสิทธิ์"
      >
        <Minus size={16} />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold"
      style={{ color: state === "own" ? C.ember : "#1E8E4F" }}
      aria-label={state === "own" ? "เฉพาะของตนเอง" : "มีสิทธิ์"}
    >
      <Check size={16} />
      {state === "own" && <span>เฉพาะของตน</span>}
    </span>
  );
}

/*
 * [V3] หน้า "บทบาทและสิทธิ์" — เฉพาะผู้ดูแลระบบ (settings.manage)
 * อ่านจาก data/roles.js ที่เดียวกับที่เมนู/ปุ่มใช้ตัดสินสิทธิ์ จึงตรงกับพฤติกรรมจริงเสมอ
 * หน้านี้ดูได้อย่างเดียว: การกำหนดบทบาทของผู้ใช้ทำที่ Cognito Group
 */
export default function AccessControl({ user }) {
  const myRoles = Array.isArray(user?.roles) ? user.roles : [];

  const groups = PERMISSION_META.reduce((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="บทบาทและสิทธิ์"
        description="สิทธิ์ของแต่ละบทบาทในระบบ (ดูอย่างเดียว) ใช้ควบคุมเมนู ปุ่ม และข้อมูลที่แต่ละคนเห็น"
      />

      {/* คำอธิบายบทบาท */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        {ROLE_COLUMNS.map((role) => (
          <div
            key={role}
            className="rounded-3xl"
            style={
              myRoles.includes(role)
                ? { outline: `2px solid ${C.teal}`, outlineOffset: 0 }
                : undefined
            }
          >
          <SectionCard hoverable={false} className="p-5 h-full">
            <div className="flex items-center justify-between gap-2 mb-2">
              <RoleBadge roleKey={role} />
              {myRoles.includes(role) && (
                <span
                  className="flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: C.tealDark }}
                >
                  <UserCheck size={13} />
                  บทบาทของคุณ
                </span>
              )}
            </div>

            <p className="text-sm leading-6" style={{ color: C.sub }}>
              {ROLE_DESCRIPTION[role]}
            </p>
          </SectionCard>
          </div>
        ))}
      </div>

      {/* ตารางสิทธิ์ */}
      <SectionCard hoverable={false} className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr style={{ background: "#F6F9FB" }}>
                <th
                  className="text-left px-5 py-3 font-semibold"
                  style={{ color: C.ink }}
                >
                  สิทธิ์
                </th>

                {ROLE_COLUMNS.map((role) => (
                  <th
                    key={role}
                    className="px-3 py-3 font-semibold text-center"
                    style={{
                      color: ROLE_META[role].fg,
                      background: myRoles.includes(role)
                        ? C.tealSoft
                        : undefined,
                    }}
                  >
                    {ROLE_META[role].label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Object.entries(groups).map(([group, items]) => (
                <React.Fragment key={group}>
                  <tr>
                    <td
                      colSpan={ROLE_COLUMNS.length + 1}
                      className="px-5 pt-4 pb-1 text-xs font-bold uppercase tracking-wide"
                      style={{ color: C.sub }}
                    >
                      {group}
                    </td>
                  </tr>

                  {items.map((item) => (
                    <tr
                      key={item.key}
                      className="border-t"
                      style={{ borderColor: C.border }}
                    >
                      <td className="px-5 py-3" style={{ color: C.ink }}>
                        {item.label}
                      </td>

                      {ROLE_COLUMNS.map((role) => (
                        <td
                          key={role}
                          className="px-3 py-3 text-center"
                          style={{
                            background: myRoles.includes(role)
                              ? "#F5F9FD"
                              : undefined,
                          }}
                        >
                          <Cell state={cellState(role, item.key)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div
        className="flex items-start gap-2 text-sm rounded-2xl px-4 py-3 mt-6"
        style={{ background: C.tealSoft, color: C.tealDark }}
      >
        <Info size={16} className="mt-0.5 shrink-0" />
        <p className="leading-6">
          การซ่อนเมนูและปุ่มในหน้านี้เป็นเพียงความสะดวกของผู้ใช้ — ระบบหลังบ้าน (API)
          ต้องตรวจสิทธิ์ทุกคำขออีกชั้น การเพิ่ม/ถอนบทบาทของผู้ใช้ทำที่ Cognito Group
          ส่วนการแก้ตารางนี้อยู่ที่ <code>src/data/roles.js</code>
        </p>
      </div>
    </div>
  );
}
