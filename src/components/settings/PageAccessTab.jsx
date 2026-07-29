import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";

const PAGES = [
  { path: "/", label: "Dashboard" },
  { path: "/musteriler", label: "Müşteriler" },
  { path: "/icerik-takvimi", label: "İçerik Takvimi" },
  { path: "/yayin-takvimi", label: "Yayın Takvimi" },
  { path: "/anlik-planlama", label: "Anlık Planlama" },
  { path: "/gorevler", label: "Görevler" },
  { path: "/ai-studio", label: "AI Stüdyosu" },
  { path: "/araclar", label: "Araç Kutusu" },
  { path: "/onaylar", label: "Onay Bekleyenler" },
  { path: "/ozel-gunler", label: "Özel Günler" },
  { path: "/tekrarlayanlar", label: "Tekrarlayanlar" },
  { path: "/faturalar", label: "Faturalar" },
  { path: "/sozlesmeler", label: "Sözleşmeler" },
  { path: "/hizmetler", label: "Hizmet Kataloğu" },
  { path: "/hedefler", label: "Hedefler" },
  { path: "/raporlar", label: "Raporlar" },
  { path: "/inbox", label: "AI Inbox" },
  { path: "/asistan", label: "WhatsApp & Telegram" },
  { path: "/web-projeleri", label: "Web Projeleri" },
  { path: "/saglik", label: "Sağlık" },
  { path: "/ayarlar", label: "Ayarlar" },
  { path: "/hesabim", label: "Hesabım" },
];

const ROLES = [
  { key: "admin", label: "Admin" },
  { key: "manager", label: "Yönetici" },
  { key: "editor", label: "Editör" },
  { key: "viewer", label: "Görüntüleyici" },
];

const DEFAULT_ACCESS = {
  "/": ["admin", "manager", "editor", "viewer"],
  "/anlik-planlama": ["admin", "manager", "editor"],
  "/icerik-takvimi": ["admin", "manager", "editor"],
  "/yayin-takvimi": ["admin", "manager", "editor"],
  "/gorevler": ["admin", "manager", "editor", "viewer"],
  "/ai-studio": ["admin", "manager", "editor"],
  "/araclar": ["admin", "manager", "editor", "viewer"],
  "/musteriler": ["admin", "manager", "editor", "viewer"],
  "/onaylar": ["admin", "manager", "editor"],
  "/ozel-gunler": ["admin", "manager"],
  "/tekrarlayanlar": ["admin", "manager", "editor"],
  "/faturalar": ["admin", "manager"],
  "/sozlesmeler": ["admin", "manager"],
  "/hizmetler": ["admin", "manager"],
  "/hedefler": ["admin", "manager", "editor"],
  "/raporlar": ["admin", "manager", "viewer"],
  "/inbox": ["admin", "manager"],
  "/asistan": ["admin", "manager"],
  "/web-projeleri": ["admin", "manager", "editor"],
  "/saglik": ["admin", "manager"],
  "/ayarlar": ["admin", "manager"],
  "/hesabim": ["admin", "manager", "editor", "viewer"],
};

export default function PageAccessTab({ settings, onUpdate }) {
  const access = settings?.page_role_access || DEFAULT_ACCESS;

  const toggle = (path, role) => {
    if (role === "admin") return; // admin always stays
    const current = access[path] || [];
    const next = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    onUpdate({ ...access, [path]: next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Sayfa Erişim Ayarları
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Her sayfa için hangi rollerin erişebileceğini ayarlayın. Admin her zaman tüm sayfalara erişebilir.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground w-48">Sayfa</th>
                {ROLES.map(r => (
                  <th key={r.key} className="p-3 text-center text-xs font-medium text-muted-foreground">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAGES.map((page, i) => {
                const roles = access[page.path] || [];
                return (
                  <tr key={page.path} className={`border-t ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="p-3 font-medium text-xs">{page.label}</td>
                    {ROLES.map(r => (
                      <td key={r.key} className="p-3 text-center">
                        <Checkbox
                          checked={roles.includes(r.key)}
                          disabled={r.key === "admin"}
                          onCheckedChange={() => toggle(page.path, r.key)}
                          className="mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}