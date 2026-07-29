import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

// Türkçe karakter desteği için basit ASCII'ye düşürme (jsPDF default font UTF-8 limited)
function tr(str = "") {
  return String(str)
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ü/g, "u").replace(/Ü/g, "U")
    .replace(/ö/g, "o").replace(/Ö/g, "O")
    .replace(/ç/g, "c").replace(/Ç/g, "C");
}

export default function CompetitorReportPDFButton({ report, company, compact = false }) {
  const handleDownload = () => {
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      const ensureSpace = (need) => {
        if (y + need > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const writeWrapped = (text, fontSize = 10, lineHeight = 5, opts = {}) => {
        doc.setFontSize(fontSize);
        if (opts.bold) doc.setFont("helvetica", "bold");
        else doc.setFont("helvetica", "normal");
        if (opts.color) doc.setTextColor(...opts.color);
        else doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(tr(text), pageW - margin * 2);
        for (const line of lines) {
          ensureSpace(lineHeight);
          doc.text(line, margin, y);
          y += lineHeight;
        }
      };

      // Başlık
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 0, pageW, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(tr("Rakip Analiz Raporu"), margin, 16);
      y = 32;

      // Meta
      writeWrapped(`Musteri: ${company.name}`, 11, 5, { bold: true });
      writeWrapped(`Sektor: ${company.sector || "-"}`, 10, 5);
      writeWrapped(`Donem: ${report.period_start} - ${report.period_end}`, 10, 5);
      writeWrapped(`Olusturulma: ${new Date(report.created_date).toLocaleDateString("tr-TR")}`, 10, 5);
      y += 4;

      // Yönetici özeti
      writeWrapped("YONETICI OZETI", 13, 6, { bold: true, color: [180, 100, 0] });
      y += 1;
      writeWrapped(report.executive_summary || "-", 10, 5);
      y += 5;

      // Zayıf yönler
      writeWrapped("ZAYIF YONLER", 13, 6, { bold: true, color: [180, 30, 30] });
      y += 1;
      (report.weaknesses || []).forEach((w, i) => {
        ensureSpace(15);
        writeWrapped(`${i + 1}. ${w.title} [${w.severity}]`, 11, 5, { bold: true });
        writeWrapped(`   ${w.description || ""}`, 10, 5);
        y += 2;
      });
      y += 3;

      // Fırsatlar
      writeWrapped("FIRSATLAR", 13, 6, { bold: true, color: [30, 130, 60] });
      y += 1;
      (report.opportunities || []).forEach((o, i) => {
        ensureSpace(20);
        writeWrapped(`${i + 1}. ${o.title} [${o.priority}]`, 11, 5, { bold: true });
        writeWrapped(`   ${o.description || ""}`, 10, 5);
        if (o.action) writeWrapped(`   -> ${o.action}`, 10, 5, { color: [30, 130, 60] });
        y += 2;
      });
      y += 3;

      // Rakipler
      writeWrapped("ANALIZ EDILEN RAKIPLER", 13, 6, { bold: true, color: [60, 60, 120] });
      y += 1;
      (report.competitors_analyzed || []).forEach((c, i) => {
        ensureSpace(25);
        writeWrapped(`${i + 1}. ${c.name || c.handle}${c.platform ? ` (${c.platform})` : ""}`, 11, 5, { bold: true });
        if (c.summary) writeWrapped(`   ${c.summary}`, 10, 5);
        if (c.recent_activity) writeWrapped(`   Son hafta: ${c.recent_activity}`, 10, 5);
        if (c.strengths?.length) writeWrapped(`   Guclu: ${c.strengths.join(", ")}`, 10, 5);
        y += 2;
      });

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`AjansPro - Rakip Analizi - Sayfa ${p}/${totalPages}`, margin, pageH - 7);
      }

      doc.save(`rakip-analizi-${tr(company.name).toLowerCase().replace(/\s+/g, "-")}-${report.period_end}.pdf`);
      toast.success("PDF indirildi");
    } catch (err) {
      toast.error("PDF olusturma hatasi: " + err.message);
    }
  };

  if (compact) {
    return (
      <Button size="sm" variant="ghost" onClick={handleDownload} className="h-7">
        <FileDown className="w-3.5 h-3.5" />
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={handleDownload}>
      <FileDown className="w-4 h-4 mr-1" /> PDF İndir
    </Button>
  );
}