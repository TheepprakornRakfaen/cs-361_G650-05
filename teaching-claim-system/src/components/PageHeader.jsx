import React from "react";
import { C } from "../theme";

/**
 * หัวข้อหน้าแบบเดียวกันทุกหน้า: ไอคอน + ชื่อหน้า + คำอธิบาย + ปุ่มด้านขวา (ถ้ามี)
 */
export default function PageHeader({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {Icon && (
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: C.tealSoft }}
          >
            <Icon size={20} style={{ color: C.tealDark }} />
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-xl font-extrabold" style={{ color: C.ink }}>
            {title}
          </h2>

          {description && (
            <p className="text-sm mt-0.5" style={{ color: C.sub }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
