import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { can } from "@/lib/permissions";

export default function PermissionGate({ resource, action, children, fallback = null }) {
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  if (!can(user, action, resource)) return fallback;
  return children;
}