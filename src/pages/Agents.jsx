import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, ShieldCheck, ArrowRight, Activity, MessageSquare, Search as SearchIcon, BarChart3, AlertOctagon } from "lucide-react";
import HelpTooltip from "@/components/help/HelpTooltip";
import MuhakemeIzi from "@/components/agents/MuhakemeIzi";
import AutoAgentsPanel from "@/components/agents/AutoAgentsPanel";
import AjanChat from "@/components/agents/AjanChat";

// Sadece gerçekten çalışan ajanlar
const AGENTS = [
  { key: "researcher", name: "Araştırmacı", en: "Researcher", icon: Search, color: "bg-blue-500", desc: "Pazar, rakip ve trend araştırması yapar. Web sitesi okur, veri toplar." },
  { key: "drafter", name: "Taslaklayıcı", en: "Drafter", icon: FileText, color: "bg-purple-500", desc: "İlk içerik ve metin taslaklarını üretir. AI ile çalışır." },
  { key: "auditor", name: "Denetçi", en: "Auditor", icon: ShieldCheck, color: "bg-amber-500", desc: "Marka uyumu ve kalite kontrolü yapar (lokal · hızlı). Otomatik onaylar." },
];

// Ajan Chat için aktif ajanlar
const ALL_AGENTS_FOR_CHAT = [
  { key: "researcher", name: "🔎 Araştırmacı", icon: Search },
  { key: "drafter", name: "✍️ Taslaklayıcı", icon: FileText },
  { key: "auditor", name: "🛡 Denetçi", icon: ShieldCheck },
  { key: "enricher", name: "🔍 Enricher", icon: SearchIcon },
  { key: "analyst", name: "📊 Analyst", icon: BarChart3 },
  { key: "anomaly", name: "🚨 Anomali Dedektörü", icon: AlertOctagon },
];

export default function Agents() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          🤖 Ajan Sistemi
          <HelpTooltip topic="agent_system" />
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          İçerik üretim hattı ve otomatik yardımcı ajanlar
        </p>
      </div>

      {/* Akış Şeması */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">Ajan Akış Şeması<HelpTooltip topic="agent_system" /></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-3">
            <div className="flex items-center gap-2 min-w-max">
              {AGENTS.map((agent, idx) => {
                const Icon = agent.icon;
                return (
                  <React.Fragment key={agent.key}>
                    <div className="flex flex-col items-center gap-1.5 w-32">
                      <div className={`w-14 h-14 rounded-full ${agent.color} flex items-center justify-center text-white shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold">{agent.name}</div>
                        <div className="text-[10px] text-muted-foreground">{agent.en}</div>
                      </div>
                    </div>
                    {idx < AGENTS.length - 1 && <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ajan Konfigürasyonları */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Ajan Detayları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AGENTS.map(agent => {
            const Icon = agent.icon;
            return (
              <Card key={agent.key}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${agent.color} flex items-center justify-center text-white flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-semibold text-sm">{agent.name}</div>
                      <Badge variant="outline" className="text-[10px]">{agent.en}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{agent.desc}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* SORUN 3: Otomatik ajanlar — Enricher, Analyst, Anomali */}
      <AutoAgentsPanel />

      <Card className="bg-orange-50/40 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm text-orange-900 mb-1 flex items-center">Otomatik İş Akışı<HelpTooltip topic="hitl_settings" /></div>
              <p className="text-xs text-orange-800">
                Denetçi (Auditor), içerik kalitesini lokal kurallarla kontrol eder ve otomatik onaylar — HITL beklemez.
                Yalnızca müşteriye gönderim ve fatura kesimi gibi kritik aksiyonlar manuel onayınızdan geçer.
                <br />
                <strong>Enricher, Analyst ve Anomali Dedektörü</strong> hiçbir zaman onay gerektirmez — otomatik çalışır.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SORUN 3: Ajanlarla Sohbet */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">💬 Ajan ile Sohbet</h2>
          <Badge variant="outline" className="text-[10px]">Tekli veya Grup</Badge>
        </div>
        <AjanChat ajanlar={ALL_AGENTS_FOR_CHAT} />
      </div>

      {/* Muhakeme İzi — Gerçek AgentWorkflowLog verisi */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Muhakeme İzi</h2>
          <Badge variant="outline" className="text-[10px]">Son 100 adım</Badge>
        </div>
        <MuhakemeIzi />
      </div>
    </div>
  );
}