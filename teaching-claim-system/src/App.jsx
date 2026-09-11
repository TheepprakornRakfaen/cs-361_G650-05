import React, { useState } from "react";
import { C } from "./theme";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import LoginModal from "./components/LoginModal";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";

const SUBTITLE_MAP = {
  home: "หน้าแรก",
  dashboard: "แดชบอร์ด",
};

// ข้อมูลตัวอย่างสำหรับ Dashboard
const CLAIMS = [
  {
    id: 1,
    courseCode: "CS101",
    month: "มิถุนายน 2569",
    hours: 12,
    status: "Approved",
  },
  {
    id: 2,
    courseCode: "CS102",
    month: "มิถุนายน 2569",
    hours: 10,
    status: "Pending",
  },
  {
    id: 3,
    courseCode: "CS201",
    month: "พฤษภาคม 2569",
    hours: 8,
    status: "Draft",
  },
  {
    id: 4,
    courseCode: "CS202",
    month: "พฤษภาคม 2569",
    hours: 6,
    status: "Rejected",
  },
];

export default function App() {
  const [view, setView] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState(null);

  const handleMenuClick = () => {
    const isMobile = window.matchMedia(
      "(max-width: 767px)"
    ).matches;

    if (isMobile) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => !c);
    }
  };

  const goCreate = () => {
    setView("create");
  };

  const goDetail = (id) => {
    setSelectedClaimId(id);
    setView("detail");
  };

  return (
    <div
      className="w-full min-h-screen flex"
      style={{ background: C.bg }}
    >
      <Sidebar
        view={view}
        setView={setView}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          collapsed
            ? "md:ml-[84px]"
            : "md:ml-[280px]"
        }`}
      >
        <Topbar
          onMenuClick={handleMenuClick}
          subtitle={SUBTITLE_MAP[view]}
          searchQuery={search}
          onSearchChange={setSearch}
          onProfileClick={() => setLoginOpen(true)}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-5 md:p-9">

            {view === "home" && (
              <Home query={search} />
            )}

            {view === "dashboard" && (
              <Dashboard
                claims={CLAIMS}
                goCreate={goCreate}
                goDetail={goDetail}
              />
            )}

            {view === "create" && (
              <div
                className="rounded-3xl p-6"
                style={{
                  background: C.card,
                  color: C.ink,
                }}
              >
                หน้าสร้างคำขอ
              </div>
            )}

            {view === "detail" && (
              <div
                className="rounded-3xl p-6"
                style={{
                  background: C.card,
                  color: C.ink,
                }}
              >
                รายละเอียดคำขอ #{selectedClaimId}
              </div>
            )}

          </div>

          {/* Footer แสดงเฉพาะหน้าแรก */}
          {view === "home" && <Footer />}
        </main>
      </div>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
      />
    </div>
  );
}