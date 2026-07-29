import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Check } from "lucide-react";
import { toast } from "sonner";

export default function TabNotes({ company }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(company.notes || "");
  const [saved, setSaved] = useState(false);

  useEffect(() => setNotes(company.notes || ""), [company.id, company.notes]);

  const save = useMutation({
    mutationFn: () => base44.entities.Company.update(company.id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Notlar kaydedildi");
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Notlar</CardTitle>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {saved ? <><Check className="w-4 h-4 mr-1" /> Kaydedildi</> : <><Save className="w-4 h-4 mr-1" /> Kaydet</>}
        </Button>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bu müşteri ile ilgili önemli notlar... (Markdown destekli)"
          rows={16}
          className="font-mono text-sm"
        />
      </CardContent>
    </Card>
  );
}