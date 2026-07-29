import { ShieldOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getAgencyRole } from "@/lib/permissions";
import { Link } from "react-router-dom";

export default function RoleGuard({ allowedRoles, children, redirect = "/" }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  if (isLoading) return null;

  const role = getAgencyRole(user);
  if (!allowedRoles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <ShieldOff className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium mb-2">Bu sayfaya erişim yetkin yok</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Bu özellik sadece belirli roller için aktif. Yöneticinden yetki talep edebilirsin.
        </p>
        <Link to={redirect} className="text-accent hover:underline text-sm">← Ana sayfaya dön</Link>
      </div>
    );
  }

  return children;
}