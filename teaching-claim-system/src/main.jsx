import React from "react";
import ReactDOM from "react-dom/client";

import "./aws-config.js";

import App from "./App.jsx";
import "./index.css";

/*
 * กันหน้าขาว: ถ้า React render พัง จะแสดงข้อความ error บนหน้าจอแทนที่จะขาวเปล่า
 * (ช่วยดีบัก — ลบออกได้เมื่อไม่ต้องการ)
 */
class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <h2 style={{ color: "#C23B3B" }}>เกิดข้อผิดพลาดในหน้าเว็บ</h2>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#FBE2E2",
            padding: 12,
            borderRadius: 8,
          }}
        >
          {String(this.state.error?.stack || this.state.error)}
        </pre>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);