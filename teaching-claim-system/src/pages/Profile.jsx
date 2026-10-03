import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Camera,
  X,
  ChevronRight,
} from "lucide-react";

import { C, STATUS_STYLE } from "../theme";
import SectionCard from "../components/SectionCard";
import { getInitial } from "../data/users";

const AVATAR_BG = `linear-gradient(135deg, #F07A7E, ${C.rose})`;

/*
 * การ์ดสถานะในส่วน "สรุปการเบิกค่าสอน" ที่กดแล้วไปหน้าคำขอของฉัน (กรองตามสถานะนั้น)
 * ตอนนี้ทำเฉพาะแบบร่าง — จะให้การ์ดอื่นกดได้ ให้เพิ่มชื่อสถานะในนี้
 * เช่น ["Draft", "Pending", "Approved"]
 */
const CLICKABLE_STATUSES = ["Draft"];

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div
      className="flex items-start gap-3 py-3 border-b last:border-0"
      style={{ borderColor: C.border }}
    >
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

        <p
          className="text-sm font-semibold break-words"
          style={{ color: C.ink }}
        >
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

export default function Profile({
  user,
  courses = [],
  claims = [],
  onLogin,
  onOpenClaims,
}) {
  const [profileImage, setProfileImage] = useState(null);
  const [imageError, setImageError] = useState("");

  const fileInputRef = useRef(null);

  /*
   * โหลดรูป Profile ที่เคยบันทึกไว้
   * รูปจะเก็บใน localStorage ของ Browser
   */
  useEffect(() => {
    if (!user?.username) {
      setProfileImage(null);
      return;
    }

    const storageKey = `teaching-claim:profile-image:${user.username}`;

    try {
      const savedImage = localStorage.getItem(storageKey);
      setProfileImage(savedImage || null);
    } catch (error) {
      console.error("Cannot load profile image:", error);
      setProfileImage(null);
    }
  }, [user?.username]);

  /*
   * เลือกรูป Profile
   */
  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file || !user?.username) return;

    setImageError("");

    // ตรวจสอบว่าเป็นรูปภาพหรือไม่
    if (!file.type.startsWith("image/")) {
      setImageError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      event.target.value = "";
      return;
    }

    // จำกัดขนาดไฟล์ไม่เกิน 2 MB
    if (file.size > 2 * 1024 * 1024) {
      setImageError("ขนาดรูปต้องไม่เกิน 2 MB");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const imageData = reader.result;

      if (typeof imageData !== "string") return;

      const storageKey =
        `teaching-claim:profile-image:${user.username}`;

      try {
        localStorage.setItem(storageKey, imageData);
        setProfileImage(imageData);
      } catch (error) {
        console.error("Cannot save profile image:", error);
        setImageError(
          "ไม่สามารถบันทึกรูปได้ กรุณาลองใช้รูปที่มีขนาดเล็กลง"
        );
      }
    };

    reader.onerror = () => {
      setImageError("ไม่สามารถอ่านไฟล์รูปภาพได้");
    };

    reader.readAsDataURL(file);

    // ทำให้เลือกไฟล์เดิมซ้ำได้
    event.target.value = "";
  };

  /*
   * ลบรูป Profile
   */
  const handleRemoveProfileImage = () => {
    if (!user?.username) return;

    const storageKey =
      `teaching-claim:profile-image:${user.username}`;

    try {
      localStorage.removeItem(storageKey);
      setProfileImage(null);
      setImageError("");
    } catch (error) {
      console.error("Cannot remove profile image:", error);
    }
  };

  const counts = useMemo(() => {
    const result = {
      Draft: 0,
      Submitted: 0,
      Approved: 0,
      Rejected: 0,
    };

    claims.forEach((claim) => {
      if (result[claim.status] !== undefined) {
        result[claim.status] += 1;
      }
    });

    return result;
  }, [claims]);

  const approvedAmount = claims
    .filter((claim) => claim.status === "Approved")
    .reduce(
      (sum, claim) => sum + Number(claim.amount || 0),
      0
    );

  // ยังไม่ได้เข้าสู่ระบบ
  if (!user) {
    return (
      <SectionCard
        className="max-w-md mx-auto p-10 text-center"
        hoverable={false}
      >
        <div
          className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: C.tealSoft }}
        >
          <UserRound
            size={26}
            style={{ color: C.tealDark }}
          />
        </div>

        <p className="font-bold" style={{ color: C.ink }}>
          กรุณาเข้าสู่ระบบ
        </p>

        <p
          className="text-sm mt-1 mb-5"
          style={{ color: C.sub }}
        >
          เข้าสู่ระบบเพื่อดูข้อมูลส่วนตัวและรายวิชาที่สอน
        </p>

        <button
          onClick={onLogin}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white"
          style={{
            background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
          }}
        >
          <LogIn size={16} />
          เข้าสู่ระบบ
        </button>
      </SectionCard>
    );
  }

  return (
    <div className="w-full">
      {/* ส่วนหัวโปรไฟล์ */}
      <div
        className="relative rounded-3xl p-6 md:p-8 mb-6 overflow-hidden text-white"
        style={{
          background: `linear-gradient(120deg, ${C.tealDark}, ${C.teal})`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-20 w-72 h-72 rounded-full"
          style={{
            background: "rgba(255,255,255,0.10)",
          }}
        />

        <div
          className="pointer-events-none absolute right-40 -bottom-24 w-48 h-48 rounded-full"
          style={{
            background: "rgba(255,255,255,0.06)",
          }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          {/* =========================
              Profile Image
             ========================= */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl md:text-4xl font-bold ring-4 ring-white/60 transition-transform hover:scale-105"
              style={{
                background: profileImage
                  ? "#fff"
                  : AVATAR_BG,
                boxShadow:
                  "0 10px 25px rgba(0,0,0,0.20)",
              }}
              aria-label="เปลี่ยนรูปโปรไฟล์"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="รูปโปรไฟล์"
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitial(user)
              )}

              {/* Overlay ตอน hover */}
              <span className="absolute inset-0 bg-black/45 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                <Camera size={22} />
                <span className="text-[10px] mt-1 font-semibold">
                  เปลี่ยนรูป
                </span>
              </span>
            </button>

            {/* ปุ่มกล้อง */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors"
              aria-label="เปลี่ยนรูปโปรไฟล์"
            >
              <Camera size={15} />
            </button>

            {/* ปุ่มลบรูป */}
            {profileImage && (
              <button
                type="button"
                onClick={handleRemoveProfileImage}
                className="absolute -right-1 -top-1 w-7 h-7 rounded-full bg-white text-red-500 flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
                aria-label="ลบรูปโปรไฟล์"
              >
                <X size={14} />
              </button>
            )}

            {/* input file ซ่อน */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileImageChange}
              className="hidden"
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm opacity-80">
              ข้อมูลส่วนตัว
            </p>

            <h2 className="text-2xl md:text-3xl font-extrabold mt-0.5 break-words">
              {user.name}
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {user.role && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background:
                      "rgba(255,255,255,0.20)",
                  }}
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

            {/* ข้อความ Error */}
            {imageError && (
              <p className="text-xs text-red-100 mt-2">
                {imageError}
              </p>
            )}

            <p className="text-xs opacity-70 mt-2">
              คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์
            </p>
          </div>
        </div>
      </div>

      {/* grid-cols-1 กันไม่ให้ชื่อวิชายาวๆ ดันการ์ดล้นจอบบนมือถือ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ข้อมูลส่วนตัว */}
        <SectionCard
          className="p-6 h-fit"
          hoverable={false}
        >
          <h3
            className="font-bold mb-2"
            style={{ color: C.ink }}
          >
            ข้อมูลส่วนตัว
          </h3>

          <InfoRow
            icon={UserRound}
            label="ชื่อ-นามสกุล"
            value={user.name}
          />

          <InfoRow
            icon={Contact}
            label="รหัสบุคลากร / รหัสนักศึกษา"
            value={user.staffId}
          />

          <InfoRow
            icon={Mail}
            label="อีเมล"
            value={user.email}
          />

          <InfoRow
            icon={Phone}
            label="เบอร์โทรศัพท์"
            value={user.phone}
          />

          <InfoRow
            icon={Building2}
            label="คณะ"
            value={user.faculty}
          />

          <InfoRow
            icon={GraduationCap}
            label="สาขาวิชา"
            value={user.department}
          />
        </SectionCard>

        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          {/* สรุปการเบิก */}
          <SectionCard
            className="p-6"
            hoverable={false}
          >
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3
                className="font-bold"
                style={{ color: C.ink }}
              >
                สรุปการเบิกค่าสอน
              </h3>

              <span
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{
                  background:
                    STATUS_STYLE.Approved.bg,
                  color:
                    STATUS_STYLE.Approved.fg,
                }}
              >
                <Wallet size={15} />
                อนุมัติแล้ว{" "}
                <span className="figure">
                  ฿{approvedAmount.toLocaleString()}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(STATUS_STYLE).map(
                ([key, style]) => {
                  const clickable =
                    CLICKABLE_STATUSES.includes(key) &&
                    Boolean(onOpenClaims);

                  // การ์ดที่กดได้เป็นปุ่ม พากลับไปหน้าคำขอของฉันที่กรองสถานะนั้นไว้
                  const Card = clickable ? "button" : "div";

                  return (
                    <Card
                      key={key}
                      {...(clickable && {
                        type: "button",
                        onClick: () => onOpenClaims(key),
                        title: `ดูรายการ${style.label}`,
                      })}
                      className={`rounded-2xl px-4 py-3 text-left ${
                        clickable
                          ? "transition-transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                          : ""
                      }`}
                      style={{
                        background: style.bg,
                      }}
                    >
                      <p
                        className="text-xs font-semibold flex items-center justify-between gap-1"
                        style={{
                          color: style.fg,
                        }}
                      >
                        {style.label}
                        {clickable && <ChevronRight size={14} />}
                      </p>

                      <p
                        className="text-2xl font-extrabold figure mt-0.5"
                        style={{
                          color: style.fg,
                        }}
                      >
                        {counts[key] || 0}
                      </p>
                    </Card>
                  );
                }
              )}
            </div>
          </SectionCard>

          {/* วิชาที่สอน */}
          <SectionCard
            className="p-6"
            hoverable={false}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-bold"
                style={{ color: C.ink }}
              >
                รายวิชาที่สอน ภาคการศึกษา 1/2569
              </h3>

              <span
                className="text-xs"
                style={{ color: C.sub }}
              >
                {courses.length} รายวิชา
              </span>
            </div>

            {courses.length === 0 ? (
              <p
                className="text-sm text-center py-6"
                style={{ color: C.sub }}
              >
                ยังไม่มีรายวิชาที่ได้รับมอบหมาย
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {courses.map((course) => {
                  const quota = Number(
                    course.quota || 45
                  );

                  const used = Number(
                    course.used || 0
                  );

                  const percent =
                    quota > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (used / quota) * 100
                          )
                        )
                      : 0;

                  return (
                    <div
                      key={course.code}
                      className="flex items-center gap-4 rounded-2xl border px-4 py-3"
                      style={{
                        borderColor: C.border,
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: C.tealSoft,
                        }}
                      >
                        <BookOpen
                          size={18}
                          style={{
                            color: C.tealDark,
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p
                            className="text-sm font-bold truncate"
                            style={{
                              color: C.ink,
                            }}
                          >
                            {course.code}

                            <span
                              className="font-medium"
                              style={{
                                color: C.sub,
                              }}
                            >
                              {" "}
                              · {course.name}
                            </span>
                          </p>

                          <span
                            className="text-xs font-semibold shrink-0"
                            style={{
                              color: C.tealDark,
                            }}
                          >
                            ฿
                            {Number(
                              course.rate || 0
                            ).toLocaleString()}
                            /ชม.
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#EEF2F5] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percent}%`,
                                background:
                                  percent > 85
                                    ? C.rose
                                    : C.teal,
                              }}
                            />
                          </div>

                          <span
                            className="text-xs shrink-0"
                            style={{
                              color: C.sub,
                            }}
                          >
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