// AjansPro — Yetki Sistemi
// agency_role: admin / manager / editor / viewer

const PERMISSIONS = {
  admin: ["*"],
  manager: [
    "companies:read", "companies:create", "companies:update", "companies:delete",
    "invoices:read", "invoices:create", "invoices:update", "invoices:delete",
    "content:read", "content:create", "content:update", "content:delete",
    "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
    "ai:read", "ai:create",
    "reports:read",
    "publish:read", "publish:create", "publish:update",
  ],
  editor: [
    "content:read", "content:create", "content:update",
    "tasks:read", "tasks:create", "tasks:update",
    "ai:read",
    "reports:read",
    "publish:read", "publish:create", "publish:update",
    "companies:read",
  ],
  viewer: [
    "reports:read",
    "companies:read",
    "content:read",
    "invoices:read",
  ],
};

export function can(user, action, resource) {
  if (!user) return false;
  // Base44 native admin = always full access
  if (user.role === "admin") return true;
  const agencyRole = user.agency_role || "viewer";
  const perms = PERMISSIONS[agencyRole] || [];
  if (perms.includes("*")) return true;
  return perms.some(p => {
    const [r, a] = p.split(":");
    return r === resource && (a === "*" || a === action);
  });
}

export function getAgencyRole(user) {
  if (user?.role === "admin") return "admin";
  return user?.agency_role || "viewer";
}

export function isAdminOrManager(user) {
  if (user?.role === "admin") return true;
  return ["admin", "manager"].includes(user?.agency_role);
}

export function getAssignedCompanies(user) {
  if (user?.role === "admin") return null; // null = tümü
  if (!user?.assigned_companies?.length) return null;
  return user.assigned_companies;
}