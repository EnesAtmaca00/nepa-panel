import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";
import MobileBottomNav from "./layout/MobileBottomNav";
import AssistantWidget from "./assistant/AssistantWidget";
import BackgroundJobsPanel from "./jobs/BackgroundJobsPanel";

// Asistan her sayfada görünür
const ASSISTANT_HIDDEN_PATHS = [];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ajanspro_dark") === "true";
  });
  const location = useLocation();

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("ajanspro_dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — masaüstünde sticky, mobilde drawer
          Eskiden h-screen + main'de overflow-y-auto vardı: sayfanın kendisi
          hiç kaymıyor, sadece içerik kutusu kendi içinde kayıyordu. Bu yüzden
          kenar çubuğu sayfadan bağımsız duruyordu.
          Şimdi belge kayıyor, çubuk yapışık kalıyor; menü ekrandan uzunsa
          üzerindeyken kendi içinde kayıyor. */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto lg:max-h-screen w-64 z-50 shrink-0 overflow-y-auto overscroll-contain scrollbar-thin transform transition-transform duration-200 ease-expo ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onMenuClick={() => setSidebarOpen(v => !v)}
        />
        {/* pb-24 lg:pb-8 = mobilde bottom nav için boşluk */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobil bottom nav */}
      <MobileBottomNav />

      {/* Arka plan işlemleri paneli — her sayfada görünür */}
      <BackgroundJobsPanel />

      {/* AI Asistan — AI Studio HARİÇ her sayfada floating */}
      {!ASSISTANT_HIDDEN_PATHS.includes(location.pathname) && <AssistantWidget />}
    </div>
  );
}