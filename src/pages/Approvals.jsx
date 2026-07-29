import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, ShieldCheck, Check, X, Eye, Clock, Copy, ExternalLink } from "lucide-react";
import { formatDateTime, diffDays } from "@/lib/format";
import { toast } from "sonner";
import ApprovalProgressBar from "@/components/content/ApprovalProgressBar";

export default function Approvals() {
  const queryClient = useQueryClient();

  const { data: ideas = [] } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => base44.entities.ContentIdea.filter({ deleted: false }, "-created_date", 500),
    initialData: [],
  });

  const { data: clientApprovals = [] } = useQuery({
    queryKey: ["client-approvals"],
    queryFn: () => base44.entities.ClientApproval.list("-sent_at", 100),
    initialData: [],
  });

  const internalPending = ideas.filter(i => i.approval_mode === "manual_internal" && i.approval_status === "pending_internal");
  const clientPending = clientApprovals.filter(a => a.status === "pending");

  const approveInternal = useMutation({
    mutationFn: (id) => base44.entities.ContentIdea.update(id, { approval_status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Onaylandı");
    },
  });

  const rejectInternal = useMutation({
    mutationFn: (id) => base44.entities.ContentIdea.update(id, { approval_status: "rejected" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Reddedildi");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Onay Bekleyenler</h1>
        <p className="text-muted-foreground text-sm mt-1">İç onay ve müşteri onayı bekleyen içerikler</p>
      </div>

      <Tabs defaultValue="internal">
        <TabsList>
          <TabsTrigger value="internal" className="gap-1">
            <ShieldCheck className="w-4 h-4" /> İç Onay ({internalPending.length})
          </TabsTrigger>
          <TabsTrigger value="client" className="gap-1">
            <Send className="w-4 h-4" /> Müşteri Onayı ({clientPending.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="mt-4">
          {internalPending.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              ✅ İç onay bekleyen içerik yok!
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {internalPending.map(idea => (
                <Card key={idea.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{idea.title}</h3>
                          <Badge variant="outline">{idea.platform}</Badge>
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200">İç Onay Bekliyor</Badge>
                        </div>
                        <Link to={`/musteriler/${idea.company_id}`} className="text-xs text-gold hover:underline">
                          {idea.company_name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {diffDays(new Date(), idea.created_date) < 0 ? `${Math.abs(diffDays(new Date(), idea.created_date))} gün` : "Bugün"} bekliyor
                        </p>
                        {idea.caption && <p className="text-sm mt-2 line-clamp-2">{idea.caption}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => rejectInternal.mutate(idea.id)} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                          <X className="w-3 h-3 mr-1" /> Revizyon İste
                        </Button>
                        <Button size="sm" onClick={() => approveInternal.mutate(idea.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <Check className="w-3 h-3 mr-1" /> İç Onay Ver
                        </Button>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <ApprovalProgressBar status={idea.approval_status} approvalMode={idea.approval_mode} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="client" className="mt-4">
          {clientPending.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              📤 Müşteri onayı bekleyen içerik yok.
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {clientPending.map(ap => (
                <Card key={ap.id}>
                  <CardContent className="p-4 flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{ap.company_name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gönderildi: {formatDateTime(ap.sent_at)}
                      </p>
                      {ap.viewed_at ? (
                        <Badge className="mt-2 bg-blue-100 text-blue-700"><Eye className="w-3 h-3 mr-1" /> Görüldü {formatDateTime(ap.viewed_at)}</Badge>
                      ) : (
                        <Badge variant="outline" className="mt-2">Henüz görmedi</Badge>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      const link = `${window.location.origin}/onay/${ap.public_token}`;
                      navigator.clipboard.writeText(link);
                      toast.success("Link kopyalandı");
                    }}>
                      <Copy className="w-3 h-3 mr-1" /> Linki Kopyala
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}