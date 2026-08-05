import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS = { admin: "Admin", manager: "Yönetici", editor: "Editör", viewer: "Görüntüleyici" };
const ROLE_COLORS = { admin: "bg-red-50 text-red-700", manager: "bg-blue-50 text-blue-700", editor: "bg-green-50 text-green-700", viewer: "bg-gray-50 text-gray-600" };

export default function TeamTab() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list("full_name", 100),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Güncellendi");
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), "user");
      toast.success(`${inviteEmail} davet edildi`);
      setInviteEmail("");
    } catch (e) {
      toast.error("Hata: " + e.message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><UserPlus className="w-4 h-4" /> Kullanıcı Davet Et</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@firma.com"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? "Davet ediliyor..." : "Davet Et"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Davet edilen kullanıcı email ile giriş yapıp şifresini belirleyecek.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4" /> Ekip Üyeleri</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-md">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{u.full_name || u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={u.agency_role || "editor"}
                  onValueChange={(v) => updateUser.mutate({ id: u.id, data: { agency_role: v } })}
                >
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.agency_role] || ROLE_COLORS.viewer}`}>
                  {ROLE_LABELS[u.agency_role] || "Görüntüleyici"}
                </Badge>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    checked={u.active !== false}
                    onCheckedChange={(v) => updateUser.mutate({ id: u.id, data: { active: v } })}
                    className="scale-75"
                  />
                  <span>{u.active !== false ? "Aktif" : "Pasif"}</span>
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Henüz ekip üyesi yok.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}