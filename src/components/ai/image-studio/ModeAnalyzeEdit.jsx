import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { Loader2, Wand2, Copy, Trash2, Pencil, Palette, Type, X } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "./ImageUploader";
import { stripThinkBlocks } from "@/lib/intelligenceLayer";

/**
 * aiInvoke `result` alanını METİN olarak döndürür — json_mode açık olsa bile.
 * Bu bileşen onu obje sanıp `data.objects` okuyordu, hep undefined geliyordu:
 * analiz "çalışıyor" görünüp hiçbir nesne listelemiyordu.
 *
 * Modeller ayrıca ```json çitleri ve <think> blokları ekleyebiliyor.
 */
function parseJSON(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  const temiz = stripThinkBlocks(String(raw))
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try { return JSON.parse(temiz); } catch (_) { /* devam */ }
  const ilk = temiz.indexOf("{"), son = temiz.lastIndexOf("}");
  if (ilk !== -1 && son > ilk) {
    try { return JSON.parse(temiz.slice(ilk, son + 1)); } catch (_) { /* devam */ }
  }
  return null;
}

function ColorDot({ color }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border border-border flex-shrink-0"
      style={{ background: color || "#ccc" }}
      title={color}
    />
  );
}

export default function ModeAnalyzeEdit({ companyId }) {
  const [imageUrl, setImageUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [objects, setObjects] = useState([]);
  const [overallStyle, setOverallStyle] = useState("");
  const [dominantColors, setDominantColors] = useState([]);
  const [mood, setMood] = useState("");
  const [changes, setChanges] = useState([]);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");

  // Modal state
  const [modalObj, setModalObj] = useState(null);
  const [modalText, setModalText] = useState("");

  const analyze = async () => {
    if (!imageUrl) { toast.error("Önce görsel yükle"); return; }
    setAnalyzing(true);
    setObjects([]);
    setChanges([]);
    setEditPrompt("");
    try {
      const res = await base44.functions.invoke("aiInvoke", {
        task_type: "vision",
        // model: "gemini-flash" KALDIRILDI — geçerli bir model kimliği
        // değildi ve Ayarlar'daki varsayılanı eziyordu. Artık kullanıcının
        // seçtiği model kullanılıyor.
        json_mode: true,
        image_urls: [imageUrl],
        prompt: `Bu görseli analiz et. İçindeki tüm görsel nesneleri listele.
Her nesne için JSON döndür:
{
  "objects": [
    { "name": "Kısa isim (Türkçe)", "position": "konum", "color": "#hex renk", "description": "1 cümle", "type": "object|text|background|logo|person" }
  ],
  "overall_style": "fotoğraf|illüstrasyon|3d|grafik",
  "dominant_colors": ["#hex1", "#hex2"],
  "mood": "kelimeler"
}`,
      });
      const payload = res.data || res;
      if (payload?.error) throw new Error(payload.error);

      const data = parseJSON(payload.result ?? payload);
      if (!data) {
        throw new Error(`Yanıt okunamadı (model: ${payload.model_used || "?"}). Görseli okuyabilen bir model seçin — örn. GPT-4o, Gemini Flash, Claude Sonnet.`);
      }
      const bulunan = data.objects || [];
      setObjects(bulunan);
      setOverallStyle(data.overall_style || "");
      setDominantColors(data.dominant_colors || []);
      setMood(data.mood || "");
      if (bulunan.length === 0) toast.warning("Görselde nesne tespit edilemedi.");
      else toast.success(`${bulunan.length} nesne bulundu`);
    } catch (e) {
      toast.error("Analiz hatası: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const addChange = (type, obj, value = "") => {
    setChanges((prev) => {
      const existing = prev.findIndex((c) => c.objName === obj.name && c.type === type);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { type, objName: obj.name, value };
        return updated;
      }
      return [...prev, { type, objName: obj.name, value }];
    });
  };

  const removeChange = (i) => setChanges((prev) => prev.filter((_, idx) => idx !== i));

  const generateEditPrompt = async () => {
    if (changes.length === 0) { toast.error("En az bir değişiklik ekle"); return; }
    setGeneratingPrompt(true);
    try {
      const changesText = changes
        .map((c) => {
          if (c.type === "replace") return `- "${c.objName}" nesnesini "${c.value}" ile değiştir`;
          if (c.type === "remove") return `- "${c.objName}" nesnesini kaldır`;
          if (c.type === "color") return `- "${c.objName}" rengini ${c.value} yap`;
          if (c.type === "text") return `- "${c.objName}" yazısını "${c.value}" olarak değiştir`;
          return "";
        })
        .join("\n");

      const res = await base44.functions.invoke("aiInvoke", {
        task_type: "text",
        prompt: `Bir görsel düzenleme için Midjourney v6 inpainting / img2img formatında İngilizce prompt oluştur.

Orijinal görsel stili: ${overallStyle}, mood: ${mood}

Yapılacak değişiklikler:
${changesText}

Sadece düzenleme talimatını Midjourney v6 komut formatında yaz. Kısa, net, profesyonel.`,
      });
      const p2 = res.data || res;
      if (p2?.error) throw new Error(p2.error);
      const metin = typeof p2.result === "string" ? p2.result : JSON.stringify(p2.result ?? p2);
      setEditPrompt(stripThinkBlocks(metin).trim());
    } catch (e) {
      toast.error("Prompt üretilemedi: " + e.message);
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const TYPE_LABELS = { object: "Nesne", text: "Yazı", background: "Arka Plan", logo: "Logo", person: "Kişi" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sol: görsel + analiz */}
      <div className="space-y-4">
        <ImageUploader value={imageUrl} onChange={setImageUrl} label="Düzenlenecek görsel" />
        <Button onClick={analyze} disabled={!imageUrl || analyzing} className="w-full gap-2">
          {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analiz ediliyor...</> : "Görseli Analiz Et"}
        </Button>

        {overallStyle && (
          <div className="surface-sunken space-y-2 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">Stil:</span> <span>{overallStyle}</span>
              <span className="font-medium ml-2">Mood:</span> <span>{mood}</span>
            </div>
            {dominantColors.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-xs">Renkler:</span>
                {dominantColors.map((c, i) => <ColorDot key={i} color={c} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sağ: nesne listesi + değişiklikler */}
      <div className="space-y-4">
        {objects.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="text-sm font-medium mb-3">Tespit Edilen Nesneler ({objects.length})</h3>
              {objects.map((obj, i) => (
                <div key={i} className="p-3 border rounded-[8px] space-y-2" style={{ borderColor: "hsl(var(--border-subtle))" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {obj.color && <ColorDot color={obj.color} />}
                      <span className="font-medium text-sm truncate">{obj.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground shrink-0">
                        {TYPE_LABELS[obj.type] || obj.type}
                      </span>
                    </div>
                  </div>
                  {obj.description && <p className="text-xs text-muted-foreground">{obj.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Button
                      size="sm" variant="outline"
                      className="h-6 text-[11px] px-2 gap-1"
                      onClick={() => { setModalObj({ ...obj, actionType: "replace" }); setModalText(""); }}
                    >
                      <Pencil style={{ width: 10, height: 10 }} /> Değiştir
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="h-6 text-[11px] px-2 gap-1 text-destructive border-destructive/30"
                      onClick={() => addChange("remove", obj)}
                    >
                      <Trash2 style={{ width: 10, height: 10 }} /> Kaldır
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="h-6 text-[11px] px-2 gap-1"
                      onClick={() => { setModalObj({ ...obj, actionType: "color" }); setModalText(obj.color || "#ffffff"); }}
                    >
                      <Palette style={{ width: 10, height: 10 }} /> Renk
                    </Button>
                    {obj.type === "text" && (
                      <Button
                        size="sm" variant="outline"
                        className="h-6 text-[11px] px-2 gap-1"
                        onClick={() => { setModalObj({ ...obj, actionType: "text" }); setModalText(""); }}
                      >
                        <Type style={{ width: 10, height: 10 }} /> Yazı
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Değişiklik listesi */}
        {changes.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">Değişiklikler ({changes.length})</h3>
              <div className="space-y-1.5 mb-4">
                {changes.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted">
                    <span className="flex-1">
                      {c.type === "replace" && `"${c.objName}" → "${c.value}"`}
                      {c.type === "remove" && `"${c.objName}" kaldır`}
                      {c.type === "color" && `"${c.objName}" renk: ${c.value}`}
                      {c.type === "text" && `"${c.objName}" yazı: "${c.value}"`}
                    </span>
                    <button onClick={() => removeChange(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Button onClick={generateEditPrompt} disabled={generatingPrompt} className="w-full gap-2">
                {generatingPrompt ? <><Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor...</> : <><Wand2 className="w-4 h-4" /> Düzenleme Promptu Üret</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {editPrompt && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Düzenleme Promptu</span>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(editPrompt); toast.success("Kopyalandı"); }}>
                  <Copy className="w-3 h-3 mr-1" /> Kopyala
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-[8px] font-mono text-xs whitespace-pre-wrap">{editPrompt}</div>
            </CardContent>
          </Card>
        )}

        {objects.length === 0 && !analyzing && (
          <div className="py-16 text-center">
            <p className="font-serif italic text-muted-foreground">Görsel yükle ve analiz et.</p>
          </div>
        )}
      </div>

      {/* Inline modal */}
      {modalObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalObj(null)}>
          <div
            className="bg-card border rounded-[14px] p-5 w-80 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium text-sm">
              {modalObj.actionType === "replace" && `"${modalObj.name}" nesnesini ne ile değiştireyim?`}
              {modalObj.actionType === "color" && `"${modalObj.name}" için yeni renk:`}
              {modalObj.actionType === "text" && `"${modalObj.name}" için yeni yazı:`}
            </h3>
            {modalObj.actionType === "color" ? (
              <input
                type="color"
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                className="w-full h-12 rounded cursor-pointer"
              />
            ) : (
              <input
                autoFocus
                className="w-full border rounded-[8px] px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-accent"
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                placeholder={modalObj.actionType === "replace" ? "örn: güneş batımı" : "Yeni yazı..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addChange(modalObj.actionType, modalObj, modalText);
                    setModalObj(null);
                  }
                }}
              />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalObj(null)}>Vazgeç</Button>
              <Button className="flex-1" onClick={() => {
                addChange(modalObj.actionType, modalObj, modalText);
                setModalObj(null);
              }}>Ekle</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}