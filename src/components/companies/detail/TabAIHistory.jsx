import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Wand2, Lightbulb, Swords } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function TabAIHistory({ company }) {
  const { data: chats = [] } = useQuery({
    queryKey: ["ai-chat-sessions", company.id],
    queryFn: () => base44.entities.AIChatSession.filter({ company_id: company.id }, "-last_message_at", 100),
    initialData: [],
  });

  const { data: prompts = [] } = useQuery({
    queryKey: ["ai-prompt-history", company.id],
    queryFn: () => base44.entities.AIPromptHistory.filter({ company_id: company.id }, "-created_date", 100),
    initialData: [],
  });

  const { data: ideaLogs = [] } = useQuery({
    queryKey: ["idea-generation-logs", company.id],
    queryFn: () => base44.entities.IdeaGenerationLog.filter({ company_id: company.id }, "-created_date", 100),
    initialData: [],
  });

  const { data: competitorReports = [] } = useQuery({
    queryKey: ["competitor-reports", company.id],
    queryFn: () => base44.entities.CompetitorReport.filter({ company_id: company.id }, "-created_date", 100),
    initialData: [],
  });

  const fmt = (d) => format(new Date(d), "d MMM yyyy HH:mm", { locale: tr });

  return (
    <div className="space-y-4">
      <Card className="bg-emerald-50/50 border-emerald-200">
        <CardContent className="p-4 text-sm">
          <p className="text-emerald-900">
            ✓ Bu müşteriye ait <strong>tüm AI geçmişi</strong> kalıcı olarak saklanır ve hiçbir zaman otomatik silinmez.
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            Sohbetler: {chats.length} • Görsel promptlar: {prompts.length} • Fikir üretimleri: {ideaLogs.length} • Rakip raporları: {competitorReports.length}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="chats">
        <TabsList>
          <TabsTrigger value="chats" className="gap-1"><MessageSquare className="w-4 h-4" /> Sohbetler ({chats.length})</TabsTrigger>
          <TabsTrigger value="prompts" className="gap-1"><Wand2 className="w-4 h-4" /> Promptlar ({prompts.length})</TabsTrigger>
          <TabsTrigger value="ideas" className="gap-1"><Lightbulb className="w-4 h-4" /> Fikirler ({ideaLogs.length})</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1"><Swords className="w-4 h-4" /> Rakip Rap. ({competitorReports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="mt-4 space-y-2">
          {chats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sohbet yok.</p>
          ) : chats.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-3">
                <p className="text-sm font-medium">{c.title || "Başlıksız"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.message_count} mesaj • {fmt(c.last_message_at || c.created_date)}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="prompts" className="mt-4 space-y-2">
          {prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Prompt yok.</p>
          ) : prompts.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.topic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.style} • {p.ai_target} • {fmt(p.created_date)}
                    </p>
                  </div>
                  {p.favorite && <Badge variant="secondary" className="text-xs">★</Badge>}
                </div>
                {p.final_prompt && (
                  <p className="text-xs mt-2 text-muted-foreground line-clamp-2 font-mono">{p.final_prompt}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ideas" className="mt-4 space-y-2">
          {ideaLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Üretim yok.</p>
          ) : ideaLogs.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-3">
                <p className="text-sm font-medium">{l.topic || l.mode}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {l.ideas_count} fikir • {(l.platforms || []).join(", ")} • {fmt(l.created_date)}
                  {l.saved_to_calendar_count > 0 && ` • ${l.saved_to_calendar_count} takvime eklendi`}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-2">
          {competitorReports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Rakip raporu yok.</p>
          ) : competitorReports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{r.period_start} → {r.period_end}</p>
                  <Badge variant="outline" className="text-xs">{r.status}</Badge>
                </div>
                {r.executive_summary && (
                  <p className="text-xs mt-1 text-muted-foreground line-clamp-2">{r.executive_summary}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}