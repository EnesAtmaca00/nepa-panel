// ============================================================
// RoleGuard — sayfa erişim kontrolü
//
// ÖNCEKİ HALİ BOZUKTU: App.jsx'ten gelen sabit `allowedRoles` listesine
// bakıyordu ve Ayarlar > Sayfa Erişimi ekranında yapılan değişiklikleri
// HİÇ OKUMUYORDU. O ekran dekoratifti — kaydediyordun ama hiçbir etkisi
// olmuyordu.
//
// Artık kaynak tek: lib/pageAccess.js + app_settings.page_role_access.
// `allowedRoles` prop'u geriye dönük uyumluluk için duruyor ama ayarlarda
// o yol için bir kural varsa ayar kazanıyor.
// ============================================================
import { ShieldOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getAgencyRole } from "@/lib/permissions";
import { rolesForPath } from "@/lib/pageAccess";

export default function RoleGuard({ allowedRoles, children, redirect = "/" }) {
  const { pathname } = useLocation();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["app-settings"],
    staleTime: 60000,
    queryFn: async () => (await base44.entities.AppSettings.list())?.[0] || {},
  });

  if (userLoading || settingsLoading) return null;

  const role = getAgencyRole(user);
  const access = settings?.page_role_access;

  // Ayarlarda bu yol için kural varsa o geçerli; yoksa sayfanın kendi
  // prop'u, o da yoksa pageAccess.js varsayılanı.
  const hasSetting = access && Object.prototype.hasOwnProperty.call(access, pathname);
  const allowed = hasSetting
    ? rolesForPath(pathname, access)
    : (allowedRoles ?? rolesForPath(pathname, access));

  // admin hiçbir koşulda kilitlenmesin
  if (role === "admin" || allowed.includes(role)) return children;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <ShieldOff className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-medium mb-2">Bu sayfaya erişim yetkin yok</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Rolün: <strong>{role}</strong> · İzinli roller: {allowed.join(", ")}
        <br />
        Yöneticinden yetki talep edebilirsin.
      </p>
      <Link to={redirect} className="text-accent hover:underline text-sm">← Ana sayfaya dön</Link>
    </div>
  );
}
