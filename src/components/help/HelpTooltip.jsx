import React, { useState } from "react";
import { HelpCircle, X, CheckCircle2 } from "lucide-react";
import { HELP_CONTENT } from "./helpContent";

/**
 * HelpTooltip - Hover'da kısa açıklama, tıklamada detay modal gösterir.
 * Kullanım: <HelpTooltip topic="brand_voice" />
 */
export default function HelpTooltip({ topic, className = "" }) {
  const [open, setOpen] = useState(false);
  const content = HELP_CONTENT[topic];

  if (!content) {
    if (typeof window !== "undefined" && window?.console) {
      console.warn(`HelpTooltip: unknown topic "${topic}"`);
    }
    return null;
  }

  return (
    <>
      {/* "?" trigger ikon — hover ile tooltip, tıklayınca modal */}
      <span className={`relative inline-flex group align-middle ${className}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 transition-colors cursor-pointer"
          aria-label={`Yardım: ${content.title}`}
        >
          <HelpCircle className="w-3 h-3" strokeWidth={2.2} />
        </button>

        {/* Hover tooltip */}
        <span
          role="tooltip"
          className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl"
        >
          <span className="block leading-snug">{content.short}</span>
          <span className="block mt-1 text-[10px] text-orange-300">Detaylar için tıkla →</span>
        </span>
      </span>

      {/* Detay modal */}
      {open && <HelpModal content={content} onClose={() => setOpen(false)} />}
    </>
  );
}

function HelpModal({ content, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <h2 className="text-lg font-bold pr-8 mb-2">{content.title}</h2>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{content.description}</p>

        {/* Benefits */}
        {content.benefits?.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-2">Ne İşe Yarar?</h3>
            <ul className="space-y-1.5">
              {content.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        {content.steps?.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-2">Nasıl Kullanılır?</h3>
            <ol className="space-y-2">
              {content.steps.map((s, i) => (
                <li
                  key={i}
                  className="text-sm border-l-2 border-orange-300 pl-3 leading-relaxed"
                >
                  <span className="font-medium text-orange-600 mr-1">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Tip */}
        {content.tip && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm">
            <span className="font-semibold">💡 İpucu: </span>
            <span className="text-amber-900">{content.tip}</span>
          </div>
        )}

        {/* Warning */}
        {content.warning && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-sm">
            <span className="font-semibold">⚠️ Dikkat: </span>
            <span className="text-red-900">{content.warning}</span>
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}