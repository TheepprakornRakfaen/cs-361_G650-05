import React from "react";
import {
  Check,
  Clock3,
  FileText,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { C } from "../theme";
import { getWorkflowSteps } from "../data/workflow";

const STATE_STYLE = {
  done: { bg: C.teal, fg: "#fff", text: C.ink },
  current: { bg: "#F6C945", fg: "#fff", text: C.ink },
  warning: { bg: "#E8873A", fg: "#fff", text: C.ink },
  error: { bg: C.rose, fg: "#fff", text: C.rose },
  pending: { bg: "#E6ECEF", fg: "#9AA9AF", text: C.sub },
};

function iconFor(step, index) {
  if (step.state === "error") return XCircle;
  if (step.state === "warning") return RotateCcw;
  if (step.state === "done") return Check;
  if (index === 0) return FileText;
  return Clock3;
}

/*
 * [V3] แถบสถานะ 3 ขั้น: ยื่นคำขอ → ตรวจสอบ → อนุมัติ
 */
export default function WorkflowStepper({ status, reviewed = false }) {
  const steps = getWorkflowSteps(status, reviewed);

  return (
    <ol className="flex items-center" aria-label="ขั้นตอนของคำขอ">
      {steps.map((step, index) => {
        const style = STATE_STYLE[step.state];
        const Icon = iconFor(step, index);
        const last = index === steps.length - 1;
        const lineDone =
          step.state === "done" &&
          steps[index + 1]?.state !== "pending";

        return (
          <React.Fragment key={step.key}>
            <li
              className="flex flex-col items-center gap-2 shrink-0"
              aria-current={step.state === "current" ? "step" : undefined}
            >
              <span
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center"
                style={{ background: style.bg }}
              >
                <Icon size={18} style={{ color: style.fg }} />
              </span>

              <span
                className="text-[10px] sm:text-[11px] md:text-xs font-medium text-center w-14 sm:w-20 md:w-24"
                style={{ color: style.text }}
              >
                {step.label}
              </span>
            </li>

            {!last && (
              <span
                aria-hidden="true"
                className="flex-1 h-[3px] mx-0.5 sm:mx-1 rounded-full min-w-[8px]"
                style={{ background: lineDone ? C.teal : "#E6ECEF" }}
              />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
