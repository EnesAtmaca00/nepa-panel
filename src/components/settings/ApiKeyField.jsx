import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Check, X, Loader2, Plug } from "lucide-react";

export default function ApiKeyField({ label, provider, value, onChange, placeholder, hint }) {
  const [status, setStatus] = useState(null); // null | "ok" | "fail"
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);

  const test = async () => {
    if (!value || !value.trim()) {
      setStatus("fail");
      setMessage("Önce API key gir");
      return;
    }
    setTesting(true);
    setStatus(null);
    try {
      const res = await base44.functions.invoke("testApiKey", { provider, api_key: value.trim() });
      const d = res.data || {};
      if (d.ok) {
        setStatus("ok");
        setMessage(d.sample ? `Bağlandı • ${d.sample}` : "Bağlandı");
      } else {
        setStatus("fail");
        setMessage(d.message || "Bağlantı kurulamadı");
      }
    } catch (e) {
      setStatus("fail");
      setMessage(e.message || "Bağlantı hatası");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <Label className="mb-1.5 flex items-center justify-between">
        <span><Key className="w-3 h-3 inline mr-1" /> {label}</span>
        {status === "ok" && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-normal">
            <Check className="w-3 h-3 mr-1" /> Bağlı
          </Badge>
        )}
        {status === "fail" && (
          <Badge className="bg-red-100 text-red-700 border-red-200 font-normal">
            <X className="w-3 h-3 mr-1" /> Bağlanamadı
          </Badge>
        )}
      </Label>
      <div className="flex gap-2">
        <Input
          type="password"
          value={value || ""}
          onChange={(e) => { onChange(e.target.value); setStatus(null); }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={test} disabled={testing}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plug className="w-3 h-3 mr-1" /> Test Et</>}
        </Button>
      </div>
      {message && (
        <p className={`text-xs mt-1 ${status === "ok" ? "text-emerald-600" : status === "fail" ? "text-red-600" : "text-muted-foreground"}`}>
          {message}
        </p>
      )}
      {hint && !message && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}