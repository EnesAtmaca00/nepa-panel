import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Merkezi ajans logo bileşeni.
 * AppSettings.agency_logo_url'i lazy-load eder.
 * Logo yoksa metin tabanlı fallback gösterir.
 */
export default function AgencyLogo({ className = "", size = "md" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ["app-settings-logo"],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 300000, // 5 dk cache
  });

  const settings = settingsList[0];
  const logoUrl = settings?.agency_logo_url;
  const agencyName = settings?.agency_name || "NePa";

  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  if (logoUrl && !error) {
    return (
      <div className={`relative ${sizeMap[size]} ${className}`}>
        {/* Skeleton placeholder göster, resim yüklenene kadar */}
        {!loaded && (
          <div className={`absolute inset-0 skeleton rounded`} />
        )}
        <img
          src={logoUrl}
          alt={agencyName}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`${sizeMap[size]} object-contain rounded transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    );
  }

  // Metin fallback
  return (
    <div className={`${sizeMap[size]} rounded bg-accent/10 flex items-center justify-center text-accent font-bold text-xs ${className}`}>
      {agencyName.slice(0, 2).toUpperCase()}
    </div>
  );
}