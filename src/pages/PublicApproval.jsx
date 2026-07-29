// AjansPro — Müşteri için public onay sayfası
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, RefreshCw, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PublicApproval() {
  const { token } = useParams();
  const [approval, setApproval] = useState(null);
  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.ClientApproval.filter({ public_token: token }, "-sent_at", 1);
        if (list.length === 0) {
          toast.error("Onay linki geçersiz veya süresi doldu");
          setLoading(false);
          return;
        }
        const ap = list[0];
        setApproval(ap);

        const i = await base44.entities.ContentIdea.get(ap.content_idea_id);
        setIdea(i);

        if (!ap.viewed_at) {
          await base44.entities.ClientApproval.update(ap.id, { viewed_at: new Date().toISOString() });
        }
      } catch (e) {
        console.error(e);
        toast.error("Yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submit = async (status) => {
    if (!name.trim()) {
      toast.error("Lütfen isminizi yazın");
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.ClientApproval.update(approval.id, {
        status,
        client_comments: comments,
        approved_at: new Date().toISOString(),
        approved_by_name: name,
      });
      const ideaStatus = status === "approved" ? "client_approved" :
                         status === "revision" ? "revision_requested" : "rejected";
      await base44.entities.ContentIdea.update(idea.id, { approval_status: ideaStatus });
      setDone(true);
    } catch (e) {
      toast.error("Hata: " + (e.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="w-8 h-8 text-gold animate-spin" />
    </div>
  );

  if (!approval || !idea) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="max-w-md text-center">
        <CardContent className="py-12">
          <X className="w-12 h-12 mx-auto mb-3 text-destructive" />
          <h2 className="font-bold text-xl">Link Geçersiz</h2>
          <p className="text-sm text-muted-foreground mt-2">Bu onay linki geçersiz veya süresi dolmuş.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="max-w-md text-center">
        <CardContent className="py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="font-bold text-xl">Teşekkürler!</h2>
          <p className="text-sm text-muted-foreground mt-2">Geri bildiriminiz alındı.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/20 text-gold text-xs font-semibold uppercase tracking-widest">
            <Crown className="w-3 h-3" /> AjansPro
          </div>
          <h1 className="text-2xl font-bold text-white mt-3">{approval.company_name}</h1>
          <p className="text-sm text-white/70">İçerik onayı bekleniyor</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold">{idea.title}</h2>
              <Badge variant="outline" className="mt-1">{idea.platform}</Badge>
            </div>

            {idea.hook && (
              <div className="p-3 bg-gold/5 border-l-4 border-gold rounded">
                <div className="text-[10px] uppercase tracking-wide text-gold font-bold">Hook</div>
                <p className="text-sm">{idea.hook}</p>
              </div>
            )}

            {idea.generated_brief && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Brief</div>
                <p className="text-sm whitespace-pre-line">{idea.generated_brief}</p>
              </div>
            )}

            {idea.caption && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Caption</div>
                <p className="text-sm whitespace-pre-line bg-muted p-3 rounded-lg">{idea.caption}</p>
              </div>
            )}

            {idea.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {idea.hashtags.map((h, i) => (
                  <span key={i} className="text-xs text-blue-600">{h.startsWith("#") ? h : `#${h}`}</span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Adınız *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız Soyadınız" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Yorum (opsiyonel)</label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder="Geri bildiriminiz..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" disabled={submitting} onClick={() => submit("rejected")} className="border-destructive text-destructive">
                <X className="w-4 h-4 mr-1" /> Reddet
              </Button>
              <Button variant="outline" disabled={submitting} onClick={() => submit("revision")}>
                <RefreshCw className="w-4 h-4 mr-1" /> Revizyon
              </Button>
              <Button disabled={submitting} onClick={() => submit("approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Onayla</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}