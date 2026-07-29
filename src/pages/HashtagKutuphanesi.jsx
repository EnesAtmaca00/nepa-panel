import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import HashtagLibrary from "@/components/hashtags/HashtagLibrary";
import { Hash } from "lucide-react";

export default function HashtagKutuphanesi() {
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    staleTime: Infinity,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Hash className="w-6 h-6 text-violet-500" />
          Hashtag Kütüphanesi
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Müşterilere özel hashtag setleri oluşturun. Rakip analizinden otomatik içe aktarın.
        </p>
      </div>
      <HashtagLibrary companies={companies} />
    </div>
  );
}