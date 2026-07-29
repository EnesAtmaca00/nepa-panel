import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, ShoppingBag, Receipt, CalendarDays,
  Calendar, Repeat, Target, CheckSquare, Sparkles, Send, Globe,
  BarChart3, TrendingUp, Settings, Zap, MessageCircle, Inbox, Pill, Radio, Wrench, User, FileText, Palette, CreditCard,
  Link2, Mail, Hash, ImagePlay, Bot, Crosshair, Presentation, AlertTriangle, Rocket
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { getAgencyRole } from "@/lib/permissions";
import AgencyLogo from "@/components/AgencyLogo";

const AM = ["admin", "manager"];
const AME = ["admin", "manager", "editor"];
const AMEV = ["admin", "manager", "editor", "viewer"];

const NAV_GROUPS = [
  {
    label: "Çalışma",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true, roles: AMEV },
      { to: "/anlik-planlama", label: "Anlık Planlama", icon: Zap, roles: AME },
      { to: "/icerik-takvimi", label: "İçerik Merkezi", icon: Calendar, roles: AME },
      { to: "/gorevler", label: "Görevler", icon: CheckSquare, roles: AMEV },
      { to: "/web-projeleri", label: "Web Projeleri", icon: Globe, roles: AME },
      { to: "/ai-studio", label: "AI Stüdyosu", icon: Sparkles, roles: AME },
      { to: "/ajanlar", label: "AI Ajanları", icon: Bot, roles: AME },
      { to: "/ai-analiz", label: "AI Analiz", icon: BarChart3, roles: AM },
      { to: "/araclar", label: "Araç Kutusu", icon: Wrench, roles: AMEV },
    ],
  },
  {
    label: "Müşteri",
    items: [
      { to: "/musteriler", label: "Müşteriler", icon: Users, roles: AMEV },
      { to: "/sunumlar", label: "🎯 Sunumlar", icon: Presentation, roles: AM },
      { to: "/leads", label: "Lead Yönetimi", icon: Crosshair, roles: AM, badge: "Kapalı" },
      { to: "/sosyal-medya", label: "Sosyal Medya", icon: Link2, roles: AM },
      { to: "/paylasim-sirasi", label: "Paylaşım Sırası", icon: Rocket, roles: AME },
      { to: "/hashtag-kutuphanesi", label: "Hashtag Kütüphanesi", icon: Hash, roles: AME },
      { to: "/medya-kutuphanesi", label: "Medya Kütüphanesi", icon: ImagePlay, roles: AME },
      { to: "/onaylar", label: "Onay Bekleyenler", icon: Send, roles: AME },
      { to: "/ozel-gunler", label: "Özel Günler", icon: CalendarDays, roles: AM },
      { to: "/tekrarlayanlar", label: "Tekrarlayanlar", icon: Repeat, roles: AME },
    ],
  },
  {
    label: "Finans",
    items: [
      { to: "/finansal-analiz", label: "Finansal Analiz", icon: TrendingUp, roles: AM },
      { to: "/faturalar", label: "Faturalar", icon: Receipt, roles: AM },
      { to: "/giderler", label: "Giderler", icon: CreditCard, roles: AM },
      { to: "/sozlesmeler", label: "Sözleşmeler", icon: FileText, roles: AM },
      { to: "/fatura-sablonlari", label: "Fatura Şablonları", icon: Palette, roles: AM },
      { to: "/hizmetler", label: "Hizmet Kataloğu", icon: ShoppingBag, roles: AM },
      { to: "/hedefler", label: "Hedefler", icon: Target, roles: AME },
      { to: "/raporlar", label: "Raporlar", icon: BarChart3, roles: AMEV },
    ],
  },
  {
    label: "Araçlar",
    items: [
      { to: "/inbox-pro", label: "AI Inbox Pro", icon: Mail, roles: AM },
      { to: "/asistan", label: "Asistan & Sohbet", icon: Bot, roles: AM },
    ],
  },
  {
    label: "Sistem",
    items: [
      { to: "/ai-hata-gunlugu", label: "AI Hata Günlüğü", icon: AlertTriangle, roles: AM },
      { to: "/ayarlar", label: "Ayarlar", icon: Settings, roles: AM },
      { to: "/hesabim", label: "Hesabım", icon: User, roles: AMEV },
    ],
  },
];

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all select-none ${
          isActive
            ? "border-l-2 border-accent bg-sidebar-accent text-foreground font-semibold pl-[9px]"
            : "border-l-2 border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground pl-[9px]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className="flex-shrink-0"
            style={{ width: 15, height: 15, strokeWidth: isActive ? 2 : 1.5, color: isActive ? "hsl(var(--accent))" : undefined }}
          />
          <span className="flex-1 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }) {
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ["app-settings-sidebar"],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 60000,
  });
  const settings = settingsList[0];
  const currentRole = getAgencyRole(user);
  const showMedication = user?.id && AM.includes(currentRole);

  return (
    <div className="h-full bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-sidebar-border flex items-center gap-2.5">
        <AgencyLogo size="sm" />
        <div>
          <div className="text-[14px] font-medium text-foreground tracking-tight leading-none">
            Ne<span
              style={{
                display: "inline-block",
                width: 11,
                height: 2.5,
                background: "hsl(var(--accent))",
                margin: "0 2px 2px",
                borderRadius: 1,
                verticalAlign: "middle",
              }}
            />Pa Panel
          </div>
          <div className="font-mono text-[10px] text-muted-foreground mt-0.5" style={{ letterSpacing: "0.02em" }}>
            v3.1
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || item.roles.includes(currentRole));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-3">
              <div
                className="px-3 pb-1 pt-0.5"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "hsl(var(--text-quaternary))",
                }}
              >
                {group.label}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavItem key={item.to} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Sağlık — koşullu */}
        {showMedication && (
          <div className="mb-3">
            <div
              className="px-3 pb-1 pt-0.5"
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#6b7280",
              }}
            >
              Kişisel
            </div>
            <NavItem
              item={{ to: "/saglik", label: "Sağlık", icon: Pill }}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </nav>

      {/* Status footer */}
      <div
        className="px-4 py-3 border-t border-sidebar-border flex items-center gap-3"
        style={{ fontSize: 11 }}
      >
        {settings?.telegram_enabled && (
          <span className="flex items-center gap-1 text-muted-foreground font-mono">
            <span className="status-dot status-dot-active" />
            Telegram
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground font-mono">
          <span className="status-dot status-dot-active" />
          Drive
        </span>
        <span className="flex-1" />
        <span className="font-mono text-muted-foreground" style={{ opacity: 0.5 }}>v3.1</span>
      </div>
    </div>
  );
}