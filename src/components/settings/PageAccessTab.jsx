import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";
import { PAGES, DEFAULT_ACCESS } from "@/lib/pageAccess";

const ROLES = [
  { key: "admin", label: "Admin" },
  { key: "manager", label: "Yönetici" },
  { key: "editor", label: "Editör" },
  { key: "viewer", label: "Görüntüleyici" },
];

export default function PageAccessTab({ access: gelen, onUpdate }) {
  // Kaydedilmemiş değişiklikler de görünsün diye üst bileşenin
  // düzenleme state'inden besleniyor, sunucu satırından değil.
  const access = { ...DEFAULT_ACCESS, ...(gelen || {}) };

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