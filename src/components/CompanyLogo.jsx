import React, { useState } from "react";

/**
 * Şirket logo bileşeni — lazy-loading ve skeleton placeholder.
 * base44 storage URL, Drive URL, veya direkt URL destekler.
 * Drive webViewLink → thumbnail URL'e dönüştürülür.
 */
function resolveLogoUrl(url) {
  if (!url) return null;
  // Google Drive webViewLink: https://drive.google.com/file/d/FILE_ID/view?...
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) {
    return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w400`;
  }
  // Google Drive open link: https://drive.google.com/open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/thumbnail?id=${driveOpenMatch[1]}&sz=w400`;
  }
  // Zaten thumbnail ya da uc?export=view ise direkt kullan
  return url;
}

export default function CompanyLogo({ logoUrl, name, className = "", size = "md" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-base",
    lg: "w-16 h-16 text-lg",
  };

  const sizeClass = sizeMap[size] || sizeMap.md;
  const resolvedUrl = resolveLogoUrl(logoUrl);

  if (resolvedUrl && !error) {
    return (
      <div className={`relative rounded-xl overflow-hidden border ${sizeClass} flex-shrink-0 ${className}`}>
        {!loaded && (
          <div className="absolute inset-0 skeleton" />
        )}
        <img
          src={resolvedUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold flex-shrink-0 ${sizeClass} ${className}`}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}