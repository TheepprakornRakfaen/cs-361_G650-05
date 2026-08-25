import React, { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { C } from "../theme";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-lg text-white"
      style={{ background: C.tealDark, animation: "fadein .2s ease" }}
    >
      <CheckCircle2 size={20} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-80 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}
