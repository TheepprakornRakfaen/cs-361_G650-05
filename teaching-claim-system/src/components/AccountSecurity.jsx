import React, { useState } from "react";
import {
  KeyRound,
  LogOut,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { C } from "../theme";
import SectionCard from "./SectionCard";
import PasswordInput from "./PasswordInput";
import {
  changePassword,
  passwordErrorMessage,
} from "../services/auth";

const MIN_LENGTH = 8;

/*
 * [V3] ความปลอดภัยของบัญชี (อยู่ในหน้าโปรไฟล์)
 *  - เปลี่ยนรหัสผ่าน
 *  - ออกจากระบบทุกอุปกรณ์ (เพิกถอน refresh token ทั้งหมด)
 */
export default function AccountSecurity({ onLogoutAll }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setDone(false);

    if (!current || !next || !confirm) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    if (next.length < MIN_LENGTH) {
      setError(`รหัสผ่านใหม่ต้องยาวอย่างน้อย ${MIN_LENGTH} ตัวอักษร`);
      return;
    }

    if (next === current) {
      setError("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน");
      return;
    }

    if (next !== confirm) {
      setError("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(passwordErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const logoutAll = async () => {
    if (
      !window.confirm(
        "ออกจากระบบทุกอุปกรณ์ รวมถึงเครื่องนี้ ใช่หรือไม่?"
      )
    ) {
      return;
    }

    setSigningOut(true);
    await onLogoutAll?.();
    setSigningOut(false);
  };

  return (
    <SectionCard className="p-6" hoverable={false}>
      <div className="flex items-center gap-3 mb-5">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: C.tealSoft, color: C.tealDark }}
        >
          <ShieldCheck size={20} />
        </span>

        <div>
          <h3 className="font-bold" style={{ color: C.ink }}>
            ความปลอดภัยของบัญชี
          </h3>

          <p className="text-xs" style={{ color: C.sub }}>
            เปลี่ยนรหัสผ่านและจัดการการเข้าสู่ระบบ
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-4 max-w-md">
        <fieldset
          disabled={loading}
          className="grid gap-4 min-w-0 border-0 p-0 m-0"
        >
          <PasswordInput
            id="sec-current"
            label="รหัสผ่านปัจจุบัน"
            value={current}
            onChange={setCurrent}
          />

          <PasswordInput
            id="sec-new"
            label="รหัสผ่านใหม่"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />

          <PasswordInput
            id="sec-confirm"
            label="ยืนยันรหัสผ่านใหม่"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />

          {error && (
            <p
              className="text-xs font-medium rounded-lg px-3 py-2"
              style={{ color: C.rose, background: C.roseSoft }}
              role="alert"
            >
              {error}
            </p>
          )}

          {done && (
            <p
              className="flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2"
              style={{ color: "#1E8E4F", background: "#DFF5E6" }}
              role="status"
            >
              <CheckCircle2 size={14} />
              เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
            </p>
          )}

          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white w-fit disabled:opacity-70"
            style={{
              background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
            }}
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <KeyRound size={15} />
            )}
            เปลี่ยนรหัสผ่าน
          </button>
        </fieldset>
      </form>

      <div
        className="mt-6 pt-5 border-t flex items-center justify-between gap-3 flex-wrap"
        style={{ borderColor: C.border }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: C.ink }}>
            ออกจากระบบทุกอุปกรณ์
          </p>

          <p className="text-xs mt-0.5" style={{ color: C.sub }}>
            ใช้เมื่อสงสัยว่ามีผู้อื่นเข้าบัญชีของคุณ
          </p>
        </div>

        <button
          type="button"
          onClick={logoutAll}
          disabled={signingOut}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors hover:bg-[#FCE9EA] disabled:opacity-60"
          style={{ borderColor: "#F3C9C9", color: "#C23B3B" }}
        >
          {signingOut ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <LogOut size={15} />
          )}
          ออกจากระบบทุกอุปกรณ์
        </button>
      </div>
    </SectionCard>
  );
}
