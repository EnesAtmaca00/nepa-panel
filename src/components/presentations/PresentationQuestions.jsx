// Adım 2a: AI sorularını cevapla
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, ArrowLeft } from "lucide-react";

export default function PresentationQuestions({ questions, detected, onBack, onSubmit }) {
  const [answers, setAnswers] = useState(questions.map(() => ""));

  const update = (i, v) => {
    const copy = [...answers];
    copy[i] = v;
    setAnswers(copy);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Geri
      </button>

      <div className="text-center">
        <Bot className="w-10 h-10 mx-auto text-orange-500 mb-2" />
        <h2 className="text-xl font-bold">Birkaç sorum var</h2>
        <p className="text-sm text-muted-foreground">Daha kaliteli sunum için bu bilgilere ihtiyacım var</p>
      </div>

      {detected && (detected.musteri_adi || detected.tespit_edilen_hizmetler?.length > 0) && (
        <Card className="bg-orange-50/50 border-orange-200">
          <CardContent className="p-3 text-xs space-y-1">
            <div className="font-semibold text-orange-900">Tespit ettim:</div>
            {detected.musteri_adi && <div>• Müşteri: <strong>{detected.musteri_adi}</strong></div>}
            {detected.konum && <div>• Konum: <strong>{detected.konum}</strong></div>}
            {detected.sektor && <div>• Sektör: <strong>{detected.sektor}</strong></div>}
            {detected.tespit_edilen_hizmetler?.length > 0 && (
              <div>• Hizmetler: <strong>{detected.tespit_edilen_hizmetler.join(", ")}</strong></div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5 space-y-4">
          {questions.map((q, i) => (
            <div key={i}>
              <label className="text-sm font-medium block mb-1.5">{q}</label>
              <input
                value={answers[i]}
                onChange={(e) => update(i, e.target.value)}
                className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:border-orange-400"
                placeholder="Cevabınız..."
              />
            </div>
          ))}
          <Button
            onClick={() => onSubmit(answers)}
            className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white"
          >
            Cevapla & Oluştur
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}