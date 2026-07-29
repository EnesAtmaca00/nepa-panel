import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Search, PenTool, ShieldCheck, Eye, Send, Bot, ArrowRight, Sparkles } from "lucide-react";

const AGENTS = [
  {
    id: "researcher",
    name: "Araştırmacı",
    icon: Search,
    color: "bg-blue-500",
    bgClass: "bg-blue-50 border-blue-200",
    textClass: "text-blue-700",
    description: "Sektör, rakip ve trend analizi yapar. Web'i tarayarak veri toplar.",
    inputs: ["Sektör bilgisi", "Rakip handle'ları", "Anahtar kelimeler"],
    outputs: ["Trend raporu", "Rakip içgörüleri", "Hashtag önerileri"],
  },
  {
    id: "drafter",
    name: "Taslaklayıcı",
    icon: PenTool,
    color: "bg-purple-500",
    bgClass: "bg-purple-50 border-purple-200",
    textClass: "text-purple-700",
    description: "Marka sesine uygun içerik metinleri ve görsel briefleri üretir.",
    inputs: ["Marka sesi rehberi", "Araştırma çıktısı", "İçerik türü"],
    outputs: ["Caption", "Hashtag seti", "Görsel brief"],
  },
  {
    id: "auditor",
    name: "Denetçi",
    icon: ShieldCheck,
    color: "bg-amber-500",
    bgClass: "bg-amber-50 border-amber-200",
    textClass: "text-amber-700",
    description: "Üretilen içeriği marka rehberine ve yasaklı kelimelere göre denetler.",
    inputs: ["Taslak içerik", "Marka rehberi", "Yasaklı kelimeler"],
    outputs: ["Onaylı/Reddedilmiş içerik", "Düzeltme önerileri"],
  },
  {
    id: "reviewer",
    name: "İnceleyici",
    icon: Eye,
    color: "bg-orange-500",
    bgClass: "bg-orange-50 border-orange-200",
    textClass: "text-orange-700",
    description: "İçeriği müşteri/iç onaya hazırlar, görsel kalite kontrolü yapar.",
    inputs: ["Denetlenmiş içerik", "Onay modu"],
    outputs: ["İç onay paketi", "Müşteri onay linki"],
  },
  {
    id: "distributor",
    name: "Dağıtıcı",
    icon: Send,
    color: "bg-emerald-500",
    bgClass: "bg-emerald-50 border-emerald-200",
    textClass: "text-emerald-700",
    description: "Onaylanan içeriği yayın takvimine yerleştirir, sosyal mecralara dağıtır.",
    inputs: ["Onaylı içerik", "Yayın takvimi"],
    outputs: ["Planlanan post", "Çoklu platform yayını"],
  },
];

export default function Ajanlar() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="w-7 h-7 text-orange-500" />
          Agentic AI Akışı
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          İçerik üretim sürecinde görev alan 5 rollü AI ajan taksonomisi
        </p>
      </div>

      {/* Banner */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
        <CardContent className="p-5 flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Çok Ajanlı İş Akışı</h3>
            <p className="text-sm text-muted-foreground">
              Her ajan bir uzmanlık alanında çalışır ve çıktısını bir sonrakine devreder.
              Bu modüler yapı sayesinde içerik üretimi hızlı, tutarlı ve marka rehberine uygun olur.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Flow */}
      <div className="space-y-3">
        {AGENTS.map((agent, idx) => {
          const Icon = agent.icon;
          return (
            <React.Fragment key={agent.id}>
              <Card className={`${agent.bgClass} border-2`}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-3 md:w-56 md:flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl ${agent.color} text-white flex items-center justify-center shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className={`text-[10px] uppercase tracking-wider ${agent.textClass} font-semibold`}>
                          Aşama {idx + 1}
                        </div>
                        <h3 className="font-bold text-lg">{agent.name}</h3>
                      </div>
                    </div>

                    {/* Description & I/O */}
                    <div className="flex-1 space-y-3">
                      <p className="text-sm text-foreground/80">{agent.description}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                            ⬇ Girdiler
                          </div>
                          <div className="space-y-1">
                            {agent.inputs.map((inp, i) => (
                              <div key={i} className="text-xs px-2 py-1 rounded bg-white/70 border border-current/10">
                                {inp}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase tracking-wider ${agent.textClass} font-semibold mb-1`}>
                            ⬆ Çıktılar
                          </div>
                          <div className="space-y-1">
                            {agent.outputs.map((out, i) => (
                              <div key={i} className={`text-xs px-2 py-1 rounded bg-white/90 border ${agent.textClass} font-medium`}>
                                {out}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Arrow */}
              {idx < AGENTS.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-orange-300 flex items-center justify-center shadow-sm">
                    <ArrowRight className="w-5 h-5 text-orange-500 rotate-90" />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Footer note */}
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Not:</strong> Bu akış, AI Stüdyosu, İçerik Takvimi ve Onaylar sayfalarında otomatik olarak çalışır.
          Her ajanın çıktısı bir sonraki ajana girdi olur ve içerik fikri "approved → sent_to_client → client_approved" iş akışında ilerler.
        </CardContent>
      </Card>
    </div>
  );
}