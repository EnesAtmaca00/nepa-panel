import React from "react";
import { PILLAR_META } from "@/lib/aiEngineHelpers";

/**
 * ContentIdea.content_pillar değeri için renkli badge.
 * Boş ise sade gri "—" gösterir.
 */
export default function PillarBadge({ pillar, size = "sm", className = "" }) {
  const meta = pillar ? PILLAR_META[pillar] : null;
  const padding = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  if (!meta) {
    return (
      <span className={`inline-flex items-center rounded border bg-gray-50 text-gray-400 border-gray-200 ${padding} ${className}`}>
        —
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-medium ${meta.className} ${padding} ${className}`}
      title={`İçerik Direği: ${meta.label}`}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}