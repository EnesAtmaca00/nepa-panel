import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Palette,
  LayoutTemplate
} from "lucide-react";
import { toast } from "sonner";
import PDFEditor from "@/components/pdf/PDFEditor";

export default function FaturaSablonlari() {
  const queryClient = useQueryClient();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["invoice-templates"],
    queryFn: () => base44.entities.InvoiceTemplate.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (config) => {
      const payload = {
        ...selectedTemplate,
        name: selectedTemplate?.name || "Yeni Şablon",
        template_config: config,
        is_default: selectedTemplate?.is_default || false
      };
      return selectedTemplate?.id 
        ? base44.entities.InvoiceTemplate.update(selectedTemplate.id, payload)
        : base44.entities.InvoiceTemplate.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      setIsEditorOpen(false);
      setSelectedTemplate(null);
      toast.success("Şablon başarıyla kaydedildi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InvoiceTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      toast.success("Şablon silindi");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id) => {
      const others = templates.filter(t => t.is_default && t.id !== id);
      for (const t of others) {
        await base44.entities.InvoiceTemplate.update(t.id, { is_default: false });
      }
      return base44.entities.InvoiceTemplate.update(id, { is_default: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      toast.success("Varsayılan şablon güncellendi");
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6 text-accent" /> Fatura Şablonları
          </h1>
          <p className="text-muted-foreground text-sm">PDF faturalarınız için görsel şablonlar oluşturun ve düzenleyin.</p>
        </div>
        <Button onClick={() => {
          setSelectedTemplate(null);
          setIsEditorOpen(true);
        }} className="bg-accent hover:bg-accent/90 text-white">
          <Plus className="h-4 w-4 mr-2" /> Yeni Şablon Oluştur
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Henüz şablon yok. Yeni bir şablon oluşturun.</p>
            <Button className="mt-4 bg-accent hover:bg-accent/90 text-white" onClick={() => setIsEditorOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Şablon Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className={`relative overflow-hidden group ${template.is_default ? 'border-accent ring-1 ring-accent' : ''}`}>
              {template.is_default && (
                <div className="absolute top-0 right-0 bg-accent text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold z-10">
                  VARSAYILAN
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  {template.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="aspect-[3/4] bg-slate-50 rounded border flex items-center justify-center group-hover:bg-slate-100 transition-colors overflow-hidden">
                  <div className="scale-[0.4] origin-center opacity-60 group-hover:opacity-100 transition-opacity">
                    <div className="w-[210px] h-[297px] bg-white shadow-sm border p-4 space-y-2">
                      <div className="h-4 w-12 bg-accent/20" />
                      <div className="h-2 w-full bg-slate-100" />
                      <div className="h-2 w-full bg-slate-100" />
                      <div className="h-2 w-2/3 bg-slate-100" />
                      <div className="mt-8 border-t pt-2">
                        <div className="h-10 w-full bg-slate-50" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-2 pt-0">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedTemplate(template);
                    setIsEditorOpen(true);
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {!template.is_default && (
                  <Button variant="outline" size="sm" onClick={() => setDefaultMutation.mutate(template.id)}>
                    Varsayılan Yap
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* PDF Editor Modal */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Şablon Düzenleyici: {selectedTemplate?.name || "Yeni Şablon"}</DialogTitle>
          </DialogHeader>
          <PDFEditor 
            data={selectedTemplate || {}} 
            onSave={(config) => saveMutation.mutate(config)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
