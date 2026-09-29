import React, { useMemo } from "react";
import {
  Mail,
  Phone,
  Contact,
  Building2,
  GraduationCap,
  BookOpen,
  Wallet,
  LogIn,
  UserRound,
} from "lucide-react";

import { C, STATUS_STYLE } from "../theme";
import SectionCard from "../components/SectionCard";
import { getInitial } from "../data/users";

const AVATAR_BG = `linear-gradient(135deg, #F07A7E, ${C.rose})`;

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: C.border }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: C.tealSoft }}
      >
        <Icon size={16} style={{ color: C.tealDark }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs" style={{ color: C.sub }}>
          {label}
        </p>
        <p className="text-sm font-semibold break-words" style={{ color: C.ink }}>
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

export default function Profile({ user, courses = [], claims = [], onLogin }) {
  const counts = useMemo(() => {
    const result = { Draft: 0, Pending: 0, Approved: 0, Rejected: 0 };
    claims.forEach((claim) => {
      if (result[claim.status] !== undefined) {
        result[claim.status] += 1;
      }
    });
    return result;
  }, [claims]);

  const approvedAmount = claims
    .filter((claim) => claim.status === "Approved")
    .reduce((sum, claim) => sum + Number(claim.amount || 0), 0);

  // ยังไม่ได้เข้าสู่ระบบ
  if (!user) {
    return (
      <SectionCard className="max-w-md mx-auto p-10 text-center" hoverable={false}>
        <div
          className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: C.tealSoft }}
        >
          <UserRound size={26} style={{ color: C.tealDark }} />
        </div>
        <p className="font-bold" style={{ color: C.ink }}>
          กรุณาเข้าสู่ระบบ
        </p>
        <p className="text-sm mt-1 mb-5" style={{ color: C.sub }}>
          เข้าสู่ระบบเพื่อดูข้อมูลส่วนตัวและรายวิชาที่สอน
        </p>
        <button
          onClick={onLogin}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white"
          style={{ background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})` }}
        >
          <LogIn size={16} />
          เข้าสู่ระบบ
        </button>
      </SectionCard>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* ส่วนหัวโปรไฟล์ */}
      <div
        className="relative rounded-3xl p-6 md:p-8 mb-6 overflow-hidden text-white"
        style={{ background: `linear-gradient(120deg, ${C.tealDark}, ${C.teal})` }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-20 w-72 h-72 rounded-full"
          style={{ background: "rgba(255,255,255,0.10)" }}
        />
        <div
          className="pointer-events-none absolute right-40 -bottom-24 w-48 h-48 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <span
            className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold shrink-0 ring-4 ring-white/60"
            style={{ background: AVATAR_BG, boxShadow: "0 10px 25px rgba(0,0,0,0.20)" }}
          >
            {getInitial(user)}
          </span>

          <div className="min-w-0">
            <p className="text-sm opacity-80">ข้อมูลส่วนตัว</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-0.5 break-words">
              {user.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {user.role && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.20)" }}
                >
                  {user.role}
                </span>
              )}
              {user.email && (
                <span className="flex items-center gap-1.5 text-sm opacity-90">
                  <Mail size={14} />
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* grid-cols-1 กันไม่ให้ชื่อวิชายาวๆ ดันการ์ดล้นจอบนมือถือ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ข้อมูลส่วนตัว */}
        <SectionCard className="p-6 h-fit" hoverable={false}>
          <h3 className="font-bold mb-2" style={{ color: C.ink }}>
            ข้อมูลส่วนตัว
          </h3>
          <InfoRow icon={UserRound} label="ชื่อ-นามสกุล" value={user.name} />
          <InfoRow icon={Contact} label="รหัสบุคลากร / รหัสนักศึกษา" value={user.staffId} />
          <InfoRow icon={Mail} label="อีเมล" value={user.email} />
          <InfoRow icon={Phone} label="เบอร์โทรศัพท์" value={user.phone} />
          <InfoRow icon={Building2} label="คณะ" value={user.faculty} />
          <InfoRow icon={GraduationCap} label="สาขาวิชา" value={user.department} />
        </SectionCard>

        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          {/* สรุปการเบิก */}
          <SectionCard className="p-6" hoverable={false}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="font-bold" style={{ color: C.ink }}>
                สรุปการเบิกค่าสอน
              </h3>
              <span
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: STATUS_STYLE.Approved.bg, color: STATUS_STYLE.Approved.fg }}
              >
                <Wallet size={15} />
                อนุมัติแล้ว <span className="figure">฿{approvedAmount.toLocaleString()}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(STATUS_STYLE).map(([key, style]) => (
                <div key={key} className="rounded-2xl px-4 py-3" style={{ background: style.bg }}>
                  <p className="text-xs font-semibold" style={{ color: style.fg }}>
                    {style.label}
                  </p>
                  <p className="text-2xl font-extrabold figure mt-0.5" style={{ color: style.fg }}>
                    {counts[key] || 0}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* วิชาที่สอน */}
          <SectionCard className="p-6" hoverable={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: C.ink }}>
                รายวิชาที่สอน ภาคการศึกษา 1/2569
              </h3>
              <span className="text-xs" style={{ color: C.sub }}>
                {courses.length} รายวิชา
              </span>
            </div>

            {courses.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: C.sub }}>
                ยังไม่มีรายวิชาที่ได้รับมอบหมาย
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {courses.map((course) => {
                  const quota = Number(course.quota || 45);
                  const used = Number(course.used || 0);
                  const percent = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

                  return (
                    <div
                      key={course.code}
                      className="flex items-center gap-4 rounded-2xl border px-4 py-3"
                      style={{ borderColor: C.border }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: C.tealSoft }}
                      >
                        <BookOpen size={18} style={{ color: C.tealDark }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold truncate" style={{ color: C.ink }}>
                            {course.code}
                            <span className="font-medium" style={{ color: C.sub }}>
                              {" "}· {course.name}
                            </span>
                          </p>
                          <span className="text-xs font-semibold shrink-0" style={{ color: C.tealDark }}>
                            ฿{Number(course.rate || 0).toLocaleString()}/ชม.
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#EEF2F5] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percent}%`, background: percent > 85 ? C.rose : C.teal }}
                            />
                          </div>
                          <span className="text-xs shrink-0" style={{ color: C.sub }}>
                            {used}/{quota} ชม.
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
