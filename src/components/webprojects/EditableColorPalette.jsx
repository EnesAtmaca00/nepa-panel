import React, { useRef } from "react";
import { Plus, X } from "lucide-react";

// Renk paletini düzenlenebilir gösterir — her kareye tıklayınca native color picker açılır.
// PC ve mobil uyumlu (h-9 dokunma alanı, sığan grid).
export default function EditableColorPalette({ colors = [], onChange }) {
  const inputsRef = useRef({});

  const updateColor = (idx, value) => {
    const next = [...colors];
    next[idx] = value;
    onChange(next);
  };

  const removeColor = (idx) => {
    const next = [...colors];
    next.splice(idx, 1);
    onChange(next);
  };

  const addColor = () => onChange([...(colors || []), "#3b82f6"]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(colors || []).map((c, idx) => (
        <div key={idx} className="relative group">
          {/* Tıklanınca color picker açan kare */}
          <button
            type="button"
            onClick={() => inputsRef.current[idx]?.click()}
            className="w-9 h-9 rounded-md border-2 border-border shadow-sm transition-transform hover:scale-105 active:scale-95"
            style={{ background: c }}
            title={`${c} — değiştirmek için tıkla`}
          />
          <input
            ref={(el) => (inputsRef.current[idx] = el)}
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#000000"}
            onChange={(e) => updateColor(idx, e.target.value)}
            className="sr-only"
            aria-label={`Renk ${idx + 1}`}
          />
          {/* Sil */}
          <button
            type="button"
            onClick={() => removeColor(idx)}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addColor}
        className="w-9 h-9 rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-500 flex items-center justify-center transition-colors"
        title="Renk ekle"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}