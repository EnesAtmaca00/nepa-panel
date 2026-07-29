import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import StepBasic from "@/components/companies/form/StepBasic";
import StepBrand from "@/components/companies/form/StepBrand";
import StepContact from "@/components/companies/form/StepContact";
import StepServices from "@/components/companies/form/StepServices";
import StepContract from "@/components/companies/form/StepContract";
import StepTargets from "@/components/companies/form/StepTargets";
import StepApproval from "@/components/companies/form/StepApproval";
import StepRecurring from "@/components/companies/form/StepRecurring";

const STEPS = [
  { id: 1, label: "Temel", description: "İsim, sektör, ülke, logo" },
  { id: 2, label: "Marka", description: "Tanım, hedef kitle, renkler" },
  { id: 3, label: "İletişim", description: "Telefon, mail, sosyal medya" },
  { id: 4, label: "Hizmet & Ücret", description: "Hizmetler, fiyatlandırma" },
  { id: 5, label: "Sözleşme", description: "Tarihler, rakipler, notlar" },
  { id: 6, label: "Hedefler", description: "Aylık/haftalık" },
  { id: 7, label: "Onay", description: "Varsayılan onay modu" },
  { id: 8, label: "Tekrarlayanlar", description: "Hayırlı Cumalar vb." },
];

const DEFAULT_DATA = {
  name: "",
  sector: "",
  country: "TR",
  logo_url: "",
  brand_description: "",
  target_audience: "",
  brand_keywords: [],
  color_palette: [],
  contact_person: "",
  phone: "",
  email: "",
  website: "",
  social_handles: { instagram: "", tiktok: "", x: "", linkedin: "", facebook: "" },
  preferred_languages: ["TR"],
  agreed_services: [],
  pricing_type: "monthly",
  monthly_fee: 0,
  one_time_fee: 0,
  currency: "TRY",
  billing_day: 1,
  contract_start_date: "",
  contract_end_date: "",
  brand_founded_date: "",
  competitor_handles: [],
  notes: "",
  monthly_targets: {},
  weekly_targets: {},
  recurring_counts_toward_target: true,
  target_reminders_enabled: true,
  default_approval_mode: "manual_internal",
  recurring_content_subscriptions: [],
  status: "active",
};

export default function CompanyNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams(); // Edit mode için ID
  const isEditMode = !!id;
  const [step, setStep] = useState(1);
  const [data, setData] = useState(DEFAULT_DATA);
  const [creatingDrive, setCreatingDrive] = useState(false);

  // Edit mode: Mevcut müşteriyi yükle
  const { data: existingCompany, isLoading: loadingCompany } = useQuery({
    queryKey: ["company", id],
    queryFn: () => base44.entities.Company.get(id),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingCompany && isEditMode) {
      setData({ ...DEFAULT_DATA, ...existingCompany });
    }
  }, [existingCompany, isEditMode]);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.ServiceCatalog.list(),
    initialData: [],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["recurring-templates"],
    queryFn: () => base44.entities.RecurringContentTemplate.list(),
    initialData: [],
  });

  const update = (patch) => setData(d => ({ ...d, ...patch }));

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEditMode) {
        // EDIT MODE: Güncelle
        const company = await base44.entities.Company.update(id, payload);

        // Tekrarlayan abonelikler için template'leri güncelle
        if (payload.recurring_content_subscriptions?.length > 0) {
          for (const tplId of payload.recurring_content_subscriptions) {
            const tpl = templates.find(t => t.id === tplId);
            if (tpl) {
              const newSubs = [...(tpl.subscribed_companies || []), company.id];
              await base44.entities.RecurringContentTemplate.update(tplId, {
                subscribed_companies: [...new Set(newSubs)],
              });
            }
          }
        }

        return company;
      } else {
        // CREATE MODE: Yeni oluştur
        // 1. Şirketi oluştur
        const company = await base44.entities.Company.create(payload);

        // 2. Drive klasörünü oluştur (arka planda)
        setCreatingDrive(true);
        try {
          await base44.functions.invoke("createCompanyDriveFolder", {
            company_id: company.id,
            company_name: company.name,
          });
        } catch (e) {
          console.error("Drive klasörü oluşturulamadı:", e);
          toast.warning("Şirket eklendi ama Drive klasörü oluşturulamadı. Detay sayfasından tekrar deneyebilirsin.");
        }

        // 3. Tekrarlayan abonelikler için template'leri güncelle
        if (payload.recurring_content_subscriptions?.length > 0) {
          for (const tplId of payload.recurring_content_subscriptions) {
            const tpl = templates.find(t => t.id === tplId);
            if (tpl) {
              const newSubs = [...(tpl.subscribed_companies || []), company.id];
              await base44.entities.RecurringContentTemplate.update(tplId, {
                subscribed_companies: [...new Set(newSubs)],
              });
            }
          }
        }

        return company;
      }
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      toast.success(isEditMode ? "Müşteri başarıyla güncellendi!" : "Müşteri başarıyla eklendi!");
      navigate(`/musteriler/${company.id}`);
    },
    onError: (err) => {
      console.error(err);
      toast.error("Müşteri eklenemedi: " + (err.message || "bilinmeyen hata"));
      setCreatingDrive(false);
    },
  });

  const handleSubmit = () => {
    if (!data.name?.trim()) {
      toast.error("Şirket adı zorunlu");
      setStep(1);
      return;
    }
    createMutation.mutate(data);
  };

  const renderStep = () => {
    const props = { data, update, services, templates };
    switch (step) {
      case 1: return <StepBasic {...props} />;
      case 2: return <StepBrand {...props} />;
      case 3: return <StepContact {...props} />;
      case 4: return <StepServices {...props} />;
      case 5: return <StepContract {...props} />;
      case 6: return <StepTargets {...props} />;
      case 7: return <StepApproval {...props} />;
      case 8: return <StepRecurring {...props} />;
      default: return null;
    }
  };

  const isLast = step === STEPS.length;
  const isLoading = createMutation.isPending || creatingDrive;

  if (isEditMode && loadingCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/musteriler")} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Müşterilere Dön
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditMode ? "Müşteri Düzenle" : "Yeni Müşteri"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
        {isEditMode ? "Müşteri bilgilerini güncelle" : "8 adımda müşteri kaydını tamamla"}
        </p>
        <p className="text-sm text-gray-600 mt-1">* işaretli alanlar zorunludur.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-2">
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.id}>
            <button
              onClick={() => setStep(s.id)}
              aria-current={step === s.id ? "step" : undefined}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                step === s.id
                  ? "bg-gold text-slate-900 shadow"
                  : step > s.id
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-muted text-gray-600 hover:bg-muted/80"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold">
                {step > s.id ? <Check className="w-3 h-3" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < STEPS.length - 1 && <div className="h-px w-2 bg-border flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold">{STEPS[step - 1].label}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[step - 1].description}</p>
          </div>
          {renderStep()}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={step === 1 || isLoading}
          onClick={() => setStep(step - 1)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Geri
        </Button>

        {!isLast ? (
          <Button onClick={() => setStep(step + 1)} disabled={isLoading}>
            İleri <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-gold text-slate-900 hover:bg-gold/90">
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> {creatingDrive ? "Drive klasörü hazırlanıyor..." : "Kaydediliyor..."}</>
            ) : (
              <><Check className="w-4 h-4 mr-1" /> Müşteriyi Oluştur</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}