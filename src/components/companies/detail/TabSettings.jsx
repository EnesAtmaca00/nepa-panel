import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, FolderPlus, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import StepTargets from "@/components/companies/form/StepTargets";

export default function TabSettings({ company }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [data, setData] = useState({
    status: company.status,
    default_approval_mode: company.default_approval_mode || "manual_internal",
    pricing_type: company.pricing_type,
    monthly_fee: company.monthly_fee || 0,
    one_time_fee: company.one_time_fee || 0,
    currency: company.currency,
    billing_day: company.billing_day || 1,
    monthly_targets: company.monthly_targets || {},
    weekly_targets: company.weekly_targets || {},
    recurring_counts_toward_target: company.recurring_counts_toward_target ?? true,
    target_reminders_enabled: company.target_reminders_enabled ?? true,
  });
  const [creatingDrive, setCreatingDrive] = useState(false);

  const save = useMutation({
    mutationFn: () => base44.entities.Company.update(company.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Kaydedildi");
    },
  });

  const deleteCompany = useMutation({
    mutationFn: () => base44.entities.Company.update(company.id, { deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Müşteri arşivlendi");
      navigate("/musteriler");
    },
  });

  const createDriveFolder = async () => {
    setCreatingDrive(true);
    try {
      await base44.functions.invoke("createCompanyDriveFolder", {
        company_id: company.id,
        company_name: company.name,
      });
      queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      toast.success("Drive klasörü oluşturuldu");
    } catch (e) {
      toast.error("Drive klasörü oluşturulamadı: " + (e.message || ""));
    } finally {
      setCreatingDrive(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Genel</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Durum</Label>
            <Select value={data.status} onValueChange={(v) => setData({ ...data, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="paused">Duraklatıldı</SelectItem>
                <SelectItem value="ended">Sonlandı</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Varsayılan Onay Modu</Label>
            <Select value={data.default_approval_mode} onValueChange={(v) => setData({ ...data, default_approval_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Onay Yok</SelectItem>
                <SelectItem value="manual_internal">Manuel İç Onay</SelectItem>
                <SelectItem value="client_approval">Müşteri Onayı</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Aylık Ücret</Label>
            <Input type="number" value={data.monthly_fee} onChange={(e) => setData({ ...data, monthly_fee: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="mb-1.5">Para Birimi</Label>
            <Select value={data.currency} onValueChange={(v) => setData({ ...data, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">₺ Türk Lirası</SelectItem>
                <SelectItem value="EUR">€ Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Fatura Günü</Label>
            <Input type="number" min="1" max="31" value={data.billing_day} onChange={(e) => setData({ ...data, billing_day: parseInt(e.target.value) || 1 })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Hedefler</CardTitle></CardHeader>
        <CardContent>
          <StepTargets data={data} update={(patch) => setData({ ...data, ...patch })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Drive Entegrasyonu</CardTitle></CardHeader>
        <CardContent>
          {company.drive_folder_url ? (
            <a href={company.drive_folder_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline">
              {company.drive_folder_url}
            </a>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Henüz Drive klasörü oluşturulmadı.</p>
              <Button onClick={createDriveFolder} disabled={creatingDrive} variant="outline">
                {creatingDrive ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Oluşturuluyor...</> : <><FolderPlus className="w-4 h-4 mr-2" /> Drive Klasörü Oluştur</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gold text-slate-900 hover:bg-gold/90">
          <Save className="w-4 h-4 mr-2" /> {save.isPending ? "Kaydediliyor..." : "Tüm Değişiklikleri Kaydet"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-1" /> Sil
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Müşteriyi sil?</AlertDialogTitle>
              <AlertDialogDescription>
                "{company.name}" arşivlenecek ve listeden kaldırılacak. Drive'daki klasör ve tüm veriler korunur. İstersen daha sonra geri alabilirsin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Vazgeç</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteCompany.mutate()} className="bg-destructive">Arşivle</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}