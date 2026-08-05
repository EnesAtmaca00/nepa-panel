import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Image as ImageIcon, MessageSquare, Languages, PenLine, Rocket } from "lucide-react";
import ImageStudio from "@/components/ai/image-studio/ImageStudio";
import CompanyChat from "@/components/ai/CompanyChat";
import CaptionTranslator from "@/components/ai/CaptionTranslator";
import CopywritingAssistant from "@/components/ai/CopywritingAssistant";
import MixGenerator from "@/components/ai/MixGenerator";
import { saveAppState, loadAppState } from "@/lib/appState";

export default function AIStudioContent({ fixedCompanyId }) {
  const [searchParams] = useSearchParams();
  const [companyId, setCompanyId] = useState(() => fixedCompanyId || loadAppState("aiStudio_lastCompanyId", "") || "");
  const [activeTab, setActiveTab] = useState(() => loadAppState("aiStudio_tab", "mix"));

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  useEffect(() => {
    if (fixedCompanyId) { setCompanyId(fixedCompanyId); return; }
    const fromUrl = searchParams.get("company");
    if (fromUrl) {
      setCompanyId(fromUrl);
      saveAppState("aiStudio_lastCompanyId", fromUrl);
    }
  }, [searchParams, fixedCompanyId]);

  const handleCompanyChange = (id) => {
    if (fixedCompanyId) return;
    setCompanyId(id);
    saveAppState("aiStudio_lastCompanyId", id || "");
  };

  const handleTabChange = (val) => {
    setActiveTab(val);
    saveAppState("aiStudio_tab", val);
  };

  return (
    <div className="space-y-6">
      {!fixedCompanyId && (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-gold" /> AI Stüdyosu
            </h1>
            <p className="text-muted-foreground text-sm mt-1">İçerik üretimi, görsel prompt, metin yazarlığı, çeviri ve sohbet</p>
          </div>
          <div className="w-full md:w-72">
            <Select value={companyId} onValueChange={handleCompanyChange}>
              <SelectTrigger><SelectValue placeholder="Müşteri seç (opsiyonel)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>— Genel (şirket bağımsız) —</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {!companyId && !fixedCompanyId && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="py-4 text-sm text-gray-800">
            🔔 Şirket seçmeden de kullanabilirsin (genel sandbox), ama marka bağlamı seçince çıktılar çok daha kişisel olur.
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          <TabsTrigger value="mix" className="gap-1" style={{ color: "#FF6B35" }}><Rocket className="w-4 h-4" /> İçerik Üret</TabsTrigger>
          <TabsTrigger value="image" className="gap-1"><ImageIcon className="w-4 h-4" /> Görsel</TabsTrigger>
          <TabsTrigger value="copywriting" className="gap-1"><PenLine className="w-4 h-4" /> Metin Yazarlığı</TabsTrigger>
          <TabsTrigger value="chat" className="gap-1"><MessageSquare className="w-4 h-4" /> Chat</TabsTrigger>
          <TabsTrigger value="translate" className="gap-1"><Languages className="w-4 h-4" /> Çeviri</TabsTrigger>
        </TabsList>

        <TabsContent value="mix" className="mt-6">
          <MixGenerator companyId={companyId} companies={companies} />
        </TabsContent>
        <TabsContent value="image" className="mt-6">
          <ImageStudio companyId={companyId} companies={companies} />
        </TabsContent>
        <TabsContent value="copywriting" className="mt-6">
          <CopywritingAssistant companyId={companyId} companies={companies} />
        </TabsContent>
        <TabsContent value="chat" className="mt-6">
          <CompanyChat companyId={companyId} companies={companies} />
        </TabsContent>
        <TabsContent value="translate" className="mt-6">
          <CaptionTranslator companyId={companyId} companies={companies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}