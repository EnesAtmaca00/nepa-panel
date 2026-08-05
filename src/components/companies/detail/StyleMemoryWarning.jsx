// Madde 3: CompanyDetail üstünde StyleMemory yoksa uyarı
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Palette } from "lucide-react";

export default function StyleMemoryWarning({ company }) {
  const { data: mems = [] } = useQuery({
    queryKey: ["style-memory-warn", company.id],
    queryFn: () => base44.entities.StyleMemory.filter({ company_id: company.id }, "-updated_date", 1),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
    enabled: !!company?.id,
  });

  if (mems.length > 0) return null;
  if (company.status !== "active") return null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-l-amber-500 bg-amber-50">
      <Palette className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <div className="font-semibold text-amber-900">🎨 Görsel Kimlik Analizi Yapılmamış</div>
        <p className="text-amber-800 text-xs mt-1">
          Bu firma için görsel kimlik analizi henüz yapılmamış. Dosyalar bölümünden logo ve tasarım örneklerini yükleyin,
          ardından "Tarz Hafızası" sekmesinden analizi başlatın.
        </p>
      </div>
    </div>
  );
}