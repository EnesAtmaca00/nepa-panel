// Liste görünümünde tek sunum kartı
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Eye, FileDown } from "lucide-react";

const STATUS_STYLES = {
  draft: { bg: "bg-slate-100 text-slate-700", label: "Taslak" },
  ready: { bg: "bg-blue-100 text-blue-700", label: "Hazır" },
  sent: { bg: "bg-purple-100 text-purple-700", label: "Gönderildi" },
  accepted: { bg: "bg-green-100 text-green-700", label: "Kabul" },
  rejected: { bg: "bg-red-100 text-red-700", label: "Red" },
};

export default function PresentationCard({ presentation, onView }) {
  const st = STATUS_STYLES[presentation.status] || STATUS_STYLES.draft;
  const services = presentation.detected_services || [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base truncate">{presentation.client_name}</h3>
            {presentation.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {presentation.location}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`text-[10px] px-2 py-0.5 rounded ${st.bg}`}>{st.label}</span>
            {presentation.revision_count > 0 && (
              <Badge variant="outline" className="text-[10px]">v{presentation.version || 1}</Badge>
            )}
          </div>
        </div>

        {services.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {services.slice(0, 4).map((s, i) => (
              <span key={i} className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
                {s}
              </span>
            ))}
            {services.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{services.length - 4}</span>
            )}
          </div>
        )}

        {presentation.meeting_date && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {presentation.meeting_date}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(presentation)}>
            <Eye className="w-3 h-3 mr-1" /> Detay Gör
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(presentation, "download")}>
            <FileDown className="w-3 h-3 mr-1" /> PDF İndir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}