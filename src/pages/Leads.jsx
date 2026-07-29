import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Lock } from "lucide-react";

export default function Leads() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card className="border-2 border-dashed">
        <CardContent className="py-20 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 justify-center">
              <Target className="w-5 h-5" /> Lead Yönetimi
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              Bu modül şu an devre dışıdır. İlerleyen güncellemelerde tekrar aktif edilecektir.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}