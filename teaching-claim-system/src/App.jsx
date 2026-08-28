import React, { useState } from "react";
import { C } from "./theme";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Home from "./pages/Home";

const SUBTITLE_MAP = {
  home: "หน้าแรก",
};

export default function App() {
  const [view, setView] = useState("home");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="w-full min-h-screen flex" style={{ background: C.bg }}>
      <Sidebar view={view} setView={setView} collapsed={collapsed} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setCollapsed((c) => !c)} subtitle={SUBTITLE_MAP[view]} />

        <main className="flex-1 overflow-y-auto p-5 md:p-9">
          {view === "home" && <Home />}
        </main>
      </div>
    </div>
  );
}
