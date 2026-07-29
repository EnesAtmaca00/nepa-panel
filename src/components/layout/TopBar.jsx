import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Moon, Sun, Bell, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useLocation } from "react-router-dom";
import { getAgencyRole, isAdminOrManager } from "@/lib/permissions";
import ActiveTaskIndicator from "@/components/ActiveTaskIndicator";

const ROLE_LABELS = { admin: "Admin", manager: "Yönetici", editor: "Editör", viewer: "Görüntüleyici" };

// Rota → mobil başlık eşlemesi
const PAGE_TITLES = {
  "/": "Anasayfa",
  "/musteriler": "Müşteriler",
  "/icerik-takvimi": "İçerik Takvimi",
  "/yayin-takvimi": "Yayın Takvimi",
  "/gorevler": "Görevler",
  "/anlik-planlama": "Anlık Planlama",
  "/ai-studio": "AI Stüdyo",
  "/araclar": "Araç Kutusu",
  "/onaylar": "Onaylar",
  "/ozel-gunler": "Özel Günler",
  "/tekrarlayanlar": "Tekrarlayanlar",
  "/faturalar": "Faturalar",
  "/giderler": "Giderler",
  "/sozlesmeler": "Sözleşmeler",
  "/hizmetler": "Hizmetler",
  "/hedefler": "Hedefler",
  "/raporlar": "Raporlar",
  "/inbox": "AI Inbox",
  "/inbox-pro": "AI Inbox",
  "/asistan": "WhatsApp / Telegram",
  "/web-projeleri": "Web Projeleri",
  "/saglik": "Sağlık",
  "/ayarlar": "Ayarlar",
  "/hesabim": "Hesabım",
  "/bildirimler": "Bildirimler",
  "/leads": "Potansiyeller",
  "/sunumlar": "Sunumlar",
  "/ajanlar": "Ajanlar",
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // En uzun eşleşen prefix'i bul (örn /musteriler/123 → Müşteriler)
  const match = Object.keys(PAGE_TITLES)
    .filter(p => p !== "/" && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : "Ne-Pa Panel";
}

export default function TopBar({ darkMode, setDarkMode, onMenuClick }) {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => base44.entities.Notification.filter({ read: false }, "-created_date", 50),
    initialData: [],
    refetchInterval: 60000,
  });

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? "İyi geceler" :
    hour < 11 ? "Günaydın" :
    hour < 14 ? "İyi öğlenler" :
    hour < 18 ? "İyi günler" :
    hour < 22 ? "İyi akşamlar" :
    "İyi geceler";

  const firstName = user?.full_name?.split(" ")[0] || "";
  const initials = user?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const role = getAgencyRole(user);

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:px-4 md:px-6 gap-2">
      {/* Sol: hamburger + başlık */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0 h-9 w-9"
          onClick={onMenuClick}
          aria-label="Menüyü aç"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden sm:block min-w-0">
          <div className="text-xs text-muted-foreground truncate">{greeting}{firstName ? `, ${firstName}` : ""}</div>
          <div className="text-sm font-semibold truncate">Ne-Pa Panel</div>
        </div>
        {/* Mobilde aktif sayfa başlığı */}
        <div className="sm:hidden min-w-0">
          <div className="text-base font-bold truncate">{pageTitle}</div>
        </div>
      </div>

      {/* Sağ: aktif işlem + bildirim + kullanıcı */}
      <div className="hidden md:flex flex-1 justify-center px-2">
        <ActiveTaskIndicator />
      </div>
      <div className="flex items-center gap-1">
        {/* Bildirimler */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9" asChild>
          <Link to="/bildirimler" aria-label={notifications.length > 0 ? `${notifications.length} okunmamış bildirim` : "Bildirimler"}>
            <Bell className="w-4.5 h-4.5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </Link>
        </Button>

        {/* Kullanıcı dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 px-1.5 sm:px-2 gap-1.5 min-w-0">
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarFallback className="text-[11px] bg-accent/10 text-accent font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium truncate max-w-[80px]">{firstName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2.5 border-b">
              <div className="text-sm font-semibold truncate">{user?.full_name}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</div>
              <Badge variant="outline" className="mt-1.5 text-[10px] h-5">{ROLE_LABELS[role] || "Görüntüleyici"}</Badge>
            </div>
            <DropdownMenuItem asChild>
              <Link to="/hesabim"><User className="w-4 h-4 mr-2" /> Hesabım</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {darkMode ? "Açık Tema" : "Koyu Tema"}
            </DropdownMenuItem>
            {isAdminOrManager(user) && (
              <DropdownMenuItem asChild>
                <Link to="/ayarlar"><Settings className="w-4 h-4 mr-2" /> Yönetim Ayarları</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}