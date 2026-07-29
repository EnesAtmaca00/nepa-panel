import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, CheckSquare, Sparkles,
  MoreHorizontal, X, Zap, Receipt, Target, Repeat, Settings,
  BarChart3, Radio, Wrench, Send, MessageCircle, Inbox,
  ShoppingBag, Globe, CalendarDays, FileText, Palette, CreditCard,
  User, Pill
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { getAgencyRole } from "@/lib/permissions";

const AM = ["admin", "manager"];
const AME = ["admin", "manager", "editor"];
const AMEV = ["admin", "manager", "editor", "viewer"];

// Ana 4 tab (her zaman görünür)
const MAIN_NAV = [
  { to: "/", label: "Anasayfa", icon: LayoutDashboard, exact: true, roles: AMEV },
  { to: "/musteriler", label: "Müşteriler", icon: Users, roles: AMEV },
  { to: "/icerik-takvimi", label: "Takvim", icon: Calendar, roles: AME },
  { to: "/gorevler", label: "Görevler", icon: CheckSquare, roles: AMEV },
];

// "Daha Fazla" menüsündeki tüm diğer sayfalar
const MORE_NAV = [
  { to: "/anlik-planlama", label: "Anlık Planlama", icon: Zap, roles: AME },
  { to: "/yayin-takvimi", label: "Yayın Takvimi", icon: Radio, roles: AME },
  { to: "/ai-studio", label: "AI Stüdyo", icon: Sparkles, roles: AME },
  { to: "/araclar", label: "Araç Kutusu", icon: Wrench, roles: AMEV },
  { to: "/onaylar", label: "Onaylar", icon: Send, roles: AME },
  { to: "/ozel-gunler", label: "Özel Günler", icon: CalendarDays, roles: AM },
  { to: "/tekrarlayanlar", label: "Tekrarlayanlar", icon: Repeat, roles: AME },
  { to: "/faturalar", label: "Faturalar", icon: Receipt, roles: AM },
  { to: "/giderler", label: "Giderler", icon: CreditCard, roles: AM },
  { to: "/sozlesmeler", label: "Sözleşmeler", icon: FileText, roles: AM },
  { to: "/hizmetler", label: "Hizmetler", icon: ShoppingBag, roles: AM },
  { to: "/hedefler", label: "Hedefler", icon: Target, roles: AME },
  { to: "/raporlar", label: "Raporlar", icon: BarChart3, roles: AMEV },
  { to: "/inbox", label: "AI Inbox", icon: Inbox, roles: AM },
  { to: "/asistan", label: "WhatsApp / Telegram", icon: MessageCircle, roles: AM },
  { to: "/web-projeleri", label: "Web Projeleri", icon: Globe, roles: AME },
  { to: "/saglik", label: "Sağlık", icon: Pill, roles: AM },
  { to: "/ayarlar", label: "Ayarlar", icon: Settings, roles: AM },
  { to: "/hesabim", label: "Hesabım", icon: User, roles: AMEV },
];

export default function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const role = getAgencyRole(user);

  const visibleMain = MAIN_NAV.filter(item => !item.roles || item.roles.includes(role));
  const visibleMore = MORE_NAV.filter(item => !item.roles || item.roles.includes(role));

  const isMoreActive = visibleMore.some(item =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <>
      {/* Overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More Sheet — yukarı açılır full-screen panel */}
      {moreOpen && (
        <div
          className="fixed inset-x-0 z-50 lg:hidden bg-background border-t border-border rounded-t-2xl shadow-2xl overflow-y-auto"
          style={{ bottom: 60, maxHeight: "72vh" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Tüm Menü</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-0.5 p-2 pb-4">
            {visibleMore.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground active:bg-muted"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                  <span className="text-[9px] font-medium text-center leading-tight">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-stretch h-[60px]">
          {visibleMain.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                    isActive ? "text-accent" : "text-muted-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-accent/10" : ""}`}>
                      <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.5} />
                    </div>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Daha Fazla butonu */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              isMoreActive || moreOpen ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${isMoreActive || moreOpen ? "bg-accent/10" : ""}`}>
              {moreOpen ? <X className="w-[18px] h-[18px]" /> : <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={1.5} />}
            </div>
            <span>Daha Fazla</span>
          </button>
        </div>


      </nav>
    </>
  );
}