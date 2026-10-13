import React, { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { C } from "../theme";
import PasswordInput from "./PasswordInput";
import {
  requestPasswordReset,
  confirmPasswordReset,
  passwordErrorMessage,
} from "../services/auth";

const MIN_LENGTH = 8;

/*
 * [V3] ลืมรหัสผ่าน 2 ขั้น
 *  1) กรอกอีเมล → Cognito ส่งรหัสยืนยันทางอีเมล
 *  2) กรอกรหัสยืนยัน + รหัสผ่านใหม่
 * ขั้นที่ 1 แจ้งผลเหมือนกันไม่ว่าอีเมลจะมีในระบบหรือไม่ (กันการเดาบัญชี)
 */
export default function ForgotPasswordForm({ onBack }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(email);
    } catch (err) {
      // บัญชีไม่มีอยู่ → ทำเหมือนส่งสำเร็จ เพื่อไม่เปิดเผยว่ามีบัญชีหรือไม่
      if (
        err?.name === "LimitExceededException" ||
        err?.name === "TooManyRequestsException"
      ) {
        setError(passwordErrorMessage(err));
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setStep("reset");
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("กรุณากรอกรหัสยืนยันจากอีเมล");
      return;
    }

    if (password.length < MIN_LENGTH) {
      setError(`รหัสผ่านใหม่ต้องยาวอย่างน้อย ${MIN_LENGTH} ตัวอักษร`);
      return;
    }

    if (password !== confirm) {
      setError("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(email, code, password);
      setStep("done");
    } catch (err) {
      setError(passwordErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="text-center">
        <CheckCircle2
          size={40}
          className="mx-auto mb-3"
          style={{ color: "#1E8E4F" }}
        />

        <h3 className="font-extrabold text-lg" style={{ color: C.ink }}>
          ตั้งรหัสผ่านใหม่เรียบร้อย
        </h3>

        <p className="text-sm mt-1.5" style={{ color: C.sub }}>
          ใช้รหัสผ่านใหม่เข้าสู่ระบบได้ทันที
        </p>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full py-3 rounded-xl font-bold text-sm text-white"
          style={{
            background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
          }}
        >
          กลับไปเข้าสู่ระบบ
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={step === "email" ? sendCode : submitReset}
      className="flex flex-col gap-4"
    >
      <div>
        <h3 className="font-extrabold text-lg" style={{ color: C.ink }}>
          ลืมรหัสผ่าน
        </h3>

        <p className="text-sm mt-1" style={{ color: C.sub }}>
          {step === "email"
            ? "กรอกอีเมลที่ใช้เข้าสู่ระบบ เราจะส่งรหัสยืนยันไปให้"
            : "หากอีเมลนี้มีบัญชีอยู่ในระบบ จะมีรหัสยืนยันส่งไปให้ กรอกรหัสและตั้งรหัสผ่านใหม่"}
        </p>
      </div>

      <fieldset
        disabled={loading}
        className="flex flex-col gap-4 min-w-0 border-0 p-0 m-0"
      >
        {step === "email" ? (
          <div>
            <label
              htmlFor="forgot-email"
              className="text-xs font-semibold mb-1.5 block"
              style={{ color: C.ink }}
            >
              อีเมล
            </label>

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-3 border"
              style={{ borderColor: C.border, background: C.bg }}
            >
              <Mail size={16} style={{ color: C.sub }} className="shrink-0" />

              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@tu.ac.th"
                autoComplete="username"
                autoFocus
                className="bg-transparent outline-none text-sm w-full"
                style={{ color: C.ink }}
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label
                htmlFor="forgot-code"
                className="text-xs font-semibold mb-1.5 block"
                style={{ color: C.ink }}
              >
                รหัสยืนยัน
              </label>

              <input
                id="forgot-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                className="w-full rounded-xl px-3 py-3 border text-sm outline-none"
                style={{ borderColor: C.border, background: C.bg, color: C.ink }}
              />
            </div>

            <PasswordInput
              id="forgot-new"
              label="รหัสผ่านใหม่"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />

            <PasswordInput
              id="forgot-confirm"
              label="ยืนยันรหัสผ่านใหม่"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
          </>
        )}

        {error && (
          <p
            className="text-xs font-medium rounded-lg px-3 py-2"
            style={{ color: C.rose, background: C.roseSoft }}
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-70"
          style={{
            background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`,
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {step === "email" ? "ส่งรหัสยืนยัน" : "ตั้งรหัสผ่านใหม่"}
        </button>
      </fieldset>

      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold text-center"
        style={{ color: C.tealDark }}
      >
        กลับไปเข้าสู่ระบบ
      </button>
    </form>
  );
}
