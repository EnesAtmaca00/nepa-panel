import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wand2, ScanSearch, Zap } from "lucide-react";
import ImagePromptGenerator from "@/components/ai/ImagePromptGenerator";
import ModeAnalyzeEdit from "./ModeAnalyzeEdit";
import ModeDirectGenerate from "./ModeDirectGenerate";

export default function ImageStudio({ companyId, companies }) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="generate">
        <TabsList className="w-full sm:w-auto flex flex-wrap gap-0">
          <TabsTrigger value="generate" className="gap-1.5 text-xs sm:text-sm">
            <Wand2 className="w-3.5 h-3.5" /> Prompt Üret
          </TabsTrigger>
          <TabsTrigger value="analyze" className="gap-1.5 text-xs sm:text-sm">
            <ScanSearch className="w-3.5 h-3.5" /> Analiz & Düzenle
          </TabsTrigger>
          <TabsTrigger value="direct" className="gap-1.5 text-xs sm:text-sm">
            <Zap className="w-3.5 h-3.5" /> Ücretsiz Üret
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <ImagePromptGenerator companyId={companyId} companies={companies} />
        </TabsContent>
        <TabsContent value="analyze" className="mt-6">
          <ModeAnalyzeEdit companyId={companyId} />
        </TabsContent>
        <TabsContent value="direct" className="mt-6">
          <ModeDirectGenerate companyId={companyId} companies={companies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}