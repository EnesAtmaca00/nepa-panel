import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Hash, TrendingUp, Zap, Clock, ChevronDown, ChevronUp, ArrowRight, BookMarked } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const PLATFORM_COLORS = {
  instagram: "#E1306C",
  tiktok: "#010101",
  linkedin: "#0A66C2",
  facebook: "#1877F2",
  twitter: "#1DA1F2",
  youtube: "#FF0000",
};

const PRIORITY_STYLE = {
  high: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function CompetitorDashboard({ report, company, onSendToCalendar }) {
  const [expandedPost, setExpandedPost] = useState(null);
  const queryClient = useQueryClient();

  const competitors = report?.competitors_analyzed || [];
  const freqData = competitors
    .filter(c => c.posts_per_week != null)
    .map(c => ({
      name: c.name || c.handle,
      posts: c.posts_per_week,
      platform: c.platform,
    }));

  const hashtagData = (report?.top_hashtags_overall || []).slice(0, 15);
  const opportunityPosts = report?.opportunity_posts || [];

  const saveHashtagsAsSet = useMutation({
    mutationFn: () => base44.entities.HashtagSet.create({
      name: `Rakip Analizi — ${report.period_end}`,
      company_id: company?.id || "",
      company_name: company?.name || "",
      platform: "all",
      hashtags: hashtagData.map(h => h.tag.startsWith("#") ? h.tag : `#${h.tag}`),
      source: "competitor_analysis",
      description: `${report.period_start} - ${report.period_end} dönemi rakip analizi hashtagleri`,
    }),
    onSuccess: () => {
      toast.success("Hashtagler kütüphaneye kaydedildi");
      queryClient.invalidateQueries({ queryKey: ["hashtag-sets"] });
      queryClient.invalidateQueries({ queryKey: ["hashtag-sets-all"] });
    },
    onError: () => toast.error("Kaydetme başarısız"),
  });

  if (!report || report.status !== "completed") return null;

  const sendToCalendar = (post) => {
    if (onSendToCalendar) {
      onSendToCalendar(post, company);
    } else {
      toast.info("İçerik takviminden yayın planına ekleyebilirsiniz.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Paylaşım Frekansı */}
      {freqData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Haftalık Paylaşım Frekansı (Rakipler)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={freqData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v) => [`${v} post/hafta`]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="posts" radius={[4, 4, 0, 0]}>
                  {freqData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={PLATFORM_COLORS[entry.platform?.toLowerCase()] || "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Rakip Özet Kartları */}
      {competitors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {competitors.map((c, i) => (
            <Card key={i} className="border-l-4" style={{ borderLeftColor: PLATFORM_COLORS[c.platform?.toLowerCase()] || "#6366f1" }}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{c.name || c.handle}</p>
                    {c.platform && (
                      <Badge variant="outline" className="text-[10px] mt-0.5">{c.platform}</Badge>
                    )}
                  </div>
                  {c.posts_per_week != null && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{c.posts_per_week}</p>
                      <p className="text-[10px] text-muted-foreground">post/hafta</p>
                    </div>
                  )}
                </div>

                {c.avg_engagement && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>Ort. etkileşim: <span className="font-medium text-foreground">{c.avg_engagement}</span></span>
                  </div>
                )}

                {c.best_post_time && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>En iyi saat: <span className="font-medium text-foreground">{c.best_post_time}</span></span>
                  </div>
                )}

                {c.top_hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.top_hashtags.slice(0, 5).map((tag, j) => (
                      <span key={j} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                {c.content_types?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.content_types.map((t, j) => (
                      <Badge key={j} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Hashtag Bulutu */}
      {hashtagData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="w-4 h-4 text-violet-600" />
                Rakiplerin En Çok Kullandığı Hashtagler
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => saveHashtagsAsSet.mutate()}
                disabled={saveHashtagsAsSet.isPending}
              >
                <BookMarked className="w-3 h-3" /> Kütüphaneye Kaydet
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {hashtagData.map((h, i) => {
                const maxCount = hashtagData[0]?.count || 1;
                const size = 10 + Math.round((h.count / maxCount) * 8);
                const opacity = 0.5 + (h.count / maxCount) * 0.5;
                return (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium cursor-default"
                    style={{ fontSize: size, opacity }}
                    title={`${h.count}x kullanıldı — ${(h.competitors || []).join(", ")}`}
                  >
                    {h.tag.startsWith("#") ? h.tag : `#${h.tag}`}
                    <span className="ml-1 text-violet-400 text-[10px]">{h.count}</span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fırsat Paylaşım Önerileri */}
      {opportunityPosts.length > 0 && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <Zap className="w-4 h-4" />
              AI Fırsat Paylaşım Önerileri ({opportunityPosts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunityPosts.map((post, i) => (
              <div
                key={i}
                className="border rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedPost(expandedPost === i ? null : i)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${PRIORITY_STYLE[post.priority] || PRIORITY_STYLE.medium}`}>
                      {post.priority === "high" ? "🔥 Yüksek" : post.priority === "medium" ? "⚡ Orta" : "💡 Düşük"}
                    </Badge>
                    <p className="font-medium text-sm truncate">{post.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {post.platform && <Badge variant="outline" className="text-[10px]">{post.platform}</Badge>}
                    {expandedPost === i ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {expandedPost === i && (
                  <div className="px-3 pb-3 space-y-2 border-t bg-muted/20">
                    {post.rationale && (
                      <p className="text-xs text-muted-foreground pt-2">{post.rationale}</p>
                    )}
                    {post.caption_idea && (
                      <div className="bg-background border rounded p-2">
                        <p className="text-[10px] text-muted-foreground mb-1 font-medium">CAPTION FİKRİ</p>
                        <p className="text-xs italic">"{post.caption_idea}"</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex flex-wrap gap-1">
                        {(post.hashtags || []).slice(0, 5).map((tag, j) => (
                          <span key={j} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </span>
                        ))}
                        {post.best_time && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
                            ⏰ {post.best_time}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => sendToCalendar(post)}
                      >
                        <ArrowRight className="w-3 h-3" /> Takvime Ekle
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}