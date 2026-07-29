import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Instagram, Linkedin, Facebook, Globe } from "lucide-react";

export default function StepContact({ data, update }) {
  const updateSocial = (key, value) => {
    update({ social_handles: { ...(data.social_handles || {}), [key]: value } });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5">İlgili Kişi</Label>
          <Input value={data.contact_person} onChange={(e) => update({ contact_person: e.target.value })} placeholder="Ahmet Yılmaz" />
        </div>
        <div>
          <Label className="mb-1.5">Telefon</Label>
          <Input value={data.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="+90 ..." />
        </div>
        <div>
          <Label className="mb-1.5">E-posta</Label>
          <Input type="email" value={data.email} onChange={(e) => update({ email: e.target.value })} placeholder="info@..." />
        </div>
        <div>
          <Label className="mb-1.5"><Globe className="w-3 h-3 inline mr-1" /> Web Sitesi</Label>
          <Input value={data.website} onChange={(e) => update({ website: e.target.value })} placeholder="https://..." />
        </div>
      </div>

      <div className="border-t pt-5">
        <h3 className="font-semibold mb-3 text-sm">Sosyal Medya Hesapları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5"><Instagram className="w-3 h-3 inline mr-1" /> Instagram</Label>
            <Input
              value={data.social_handles?.instagram || ""}
              onChange={(e) => updateSocial("instagram", e.target.value)}
              placeholder="@kullaniciadi"
            />
          </div>
          <div>
            <Label className="mb-1.5">TikTok</Label>
            <Input
              value={data.social_handles?.tiktok || ""}
              onChange={(e) => updateSocial("tiktok", e.target.value)}
              placeholder="@kullaniciadi"
            />
          </div>
          <div>
            <Label className="mb-1.5"><Linkedin className="w-3 h-3 inline mr-1" /> LinkedIn</Label>
            <Input
              value={data.social_handles?.linkedin || ""}
              onChange={(e) => updateSocial("linkedin", e.target.value)}
              placeholder="linkedin.com/company/..."
            />
          </div>
          <div>
            <Label className="mb-1.5">X (Twitter)</Label>
            <Input
              value={data.social_handles?.x || ""}
              onChange={(e) => updateSocial("x", e.target.value)}
              placeholder="@kullaniciadi"
            />
          </div>
          <div>
            <Label className="mb-1.5"><Facebook className="w-3 h-3 inline mr-1" /> Facebook</Label>
            <Input
              value={data.social_handles?.facebook || ""}
              onChange={(e) => updateSocial("facebook", e.target.value)}
              placeholder="facebook.com/..."
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-5">
        <Label className="mb-2 block">Tercih Edilen Diller</Label>
        <div className="flex flex-wrap gap-2">
          {["TR", "NL", "FR", "EN"].map(lang => {
            const selected = (data.preferred_languages || []).includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  const current = data.preferred_languages || [];
                  update({
                    preferred_languages: selected
                      ? current.filter(l => l !== lang)
                      : [...current, lang]
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selected
                    ? "bg-gold text-slate-900 border-gold"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}