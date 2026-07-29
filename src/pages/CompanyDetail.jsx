import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { COUNTRY_FLAGS, getStatusColor, getStatusLabel } from "@/lib/format";
import TabOverview from "@/components/companies/detail/TabOverview";
import TabBrandKit from "@/components/companies/detail/TabBrandKit";
import TabFiles from "@/components/companies/detail/TabFiles";
import TabInvoices from "@/components/companies/detail/TabInvoices";
import TabContent from "@/components/companies/detail/TabContent";
import TabRecurring from "@/components/companies/detail/TabRecurring";
import TabTargets from "@/components/companies/detail/TabTargets";
import TabAIStudio from "@/components/companies/detail/TabAIStudio";
import TabCompetitors from "@/components/companies/detail/TabCompetitors";
import TabAIHistory from "@/components/companies/detail/TabAIHistory";
import TabStyleMemory from "@/components/companies/detail/TabStyleMemory";
import TabApprovalHistory from "@/components/companies/detail/TabApprovalHistory";
import TabNotes from "@/components/companies/detail/TabNotes";
import TabSettings from "@/components/companies/detail/TabSettings";
import TabPublish from "@/components/companies/detail/TabPublish";
import CustomerScoreBar from "@/components/companies/detail/CustomerScoreBar";
import BrandVoiceGuide from "@/components/companies/detail/BrandVoiceGuide";
import EnrichmentPanel from "@/components/companies/detail/EnrichmentPanel";
import StyleMemoryWarning from "@/components/companies/detail/StyleMemoryWarning";

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: () => base44.entities.Company.get(id),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;
  if (!company) return <div className="text-center py-12 text-muted-foreground">Müşteri bulunamadı.</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/musteriler")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Müşterilere Dön
      </Button>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="w-20 h-20 rounded-2xl object-cover border-2 shadow" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white text-3xl font-bold shadow">
            {company.name?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{company.name}</h1>
            <span className="text-2xl">{COUNTRY_FLAGS[company.country]}</span>
            <Badge className={getStatusColor(company.status)}>{getStatusLabel(company.status)}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{company.sector || "—"}</p>
        </div>
        <div className="flex gap-2">
          {company.drive_folder_url && (
            <Button variant="outline" asChild>
              <a href={company.drive_folder_url} target="_blank" rel="noopener noreferrer">
                <FolderOpen className="w-4 h-4 mr-1" /> Drive
              </a>
            </Button>
          )}
        </div>
      </div>

      <CustomerScoreBar company={company} />
      <StyleMemoryWarning company={company} />

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="brand">Marka Kit</TabsTrigger>
            <TabsTrigger value="files">Dosyalar</TabsTrigger>
            <TabsTrigger value="invoices">Faturalar</TabsTrigger>
            <TabsTrigger value="content">İçerikler</TabsTrigger>
            <TabsTrigger value="recurring">Tekrarlayanlar</TabsTrigger>
            <TabsTrigger value="targets">Hedefler</TabsTrigger>
            <TabsTrigger value="ai">AI Stüdyosu</TabsTrigger>
            <TabsTrigger value="competitors">Rakip Analizi</TabsTrigger>
            <TabsTrigger value="ai-history">AI Geçmişi</TabsTrigger>
            <TabsTrigger value="style">Tarz Hafızası</TabsTrigger>
            <TabsTrigger value="approval">Onay Geçmişi</TabsTrigger>
            <TabsTrigger value="notes">Notlar</TabsTrigger>
            <TabsTrigger value="publish">Yayın Takvimi</TabsTrigger>
            <TabsTrigger value="settings">Ayarlar</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          <div className="space-y-6">
            <TabOverview company={company} />
            <EnrichmentPanel company={company} />
            <BrandVoiceGuide company={company} />
          </div>
        </TabsContent>
        <TabsContent value="brand" className="mt-6"><TabBrandKit company={company} /></TabsContent>
        <TabsContent value="files" className="mt-6"><TabFiles company={company} /></TabsContent>
        <TabsContent value="invoices" className="mt-6"><TabInvoices company={company} /></TabsContent>
        <TabsContent value="content" className="mt-6"><TabContent company={company} /></TabsContent>
        <TabsContent value="recurring" className="mt-6"><TabRecurring company={company} /></TabsContent>
        <TabsContent value="targets" className="mt-6"><TabTargets company={company} /></TabsContent>
        <TabsContent value="ai" className="mt-6"><TabAIStudio company={company} /></TabsContent>
        <TabsContent value="competitors" className="mt-6"><TabCompetitors company={company} /></TabsContent>
        <TabsContent value="ai-history" className="mt-6"><TabAIHistory company={company} /></TabsContent>
        <TabsContent value="style" className="mt-6"><TabStyleMemory company={company} /></TabsContent>
        <TabsContent value="approval" className="mt-6"><TabApprovalHistory company={company} /></TabsContent>
        <TabsContent value="notes" className="mt-6"><TabNotes company={company} /></TabsContent>
        <TabsContent value="publish" className="mt-6"><TabPublish company={company} /></TabsContent>
        <TabsContent value="settings" className="mt-6"><TabSettings company={company} /></TabsContent>
      </Tabs>
    </div>
  );
}