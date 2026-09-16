"use client";

import { useState } from "react";
import { TEXTURES, TEXTURE_OTHER_LABEL } from "@/lib/constants";

interface TexturePanelProps {
  value: string | null;
  onChange: (texture: string) => void;
  onClose: () => void;
}

const knownTextures: readonly string[] = TEXTURES;

export function TexturePanel({ value, onChange, onClose }: TexturePanelProps) {
  const initialIsOther = !!value && !knownTextures.includes(value);
  const [otherSelected, setOtherSelected] = useState(initialIsOther);
  const [otherText, setOtherText] = useState(initialIsOther ? value! : "");

  function pickKnown(t: string) {
    setOtherSelected(false);
    onChange(t);
  }
  function pickOther() {
    setOtherSelected(true);
    if (otherText.trim()) onChange(otherText.trim());
  }
  function updateOtherText(text: string) {
    setOtherText(text);
    if (text.trim()) onChange(text.trim());
  }

  const hasValue = !!value;

  return (
    <>
      <button className="sheet-close" onClick={onClose}>✕</button>
      <div className="sheet-title">¿CON QUÉ TEXTURA LO ASOCIAS?</div>
      <div className="tex-grid">
        {TEXTURES.map(t => (
          <button
            key={t}
            className={`tex-chip ${!otherSelected && value === t ? "picked" : ""}`}
            onClick={() => pickKnown(t)}
          >
            {t}
          </button>
        ))}
        <div className={`tex-chip other-chip ${otherSelected ? "picked" : ""}`} onClick={pickOther}>
          {TEXTURE_OTHER_LABEL}
          {otherSelected && (
            <input
              className="tex-other-input"
              type="text"
              placeholder="Escribe una textura"
              value={otherText}
              onClick={e => e.stopPropagation()}
              onChange={e => updateOtherText(e.target.value)}
              autoFocus
            />
          )}
        </div>
      </div>
      <button className={`sheet-save-btn ${hasValue ? "ready" : ""}`} disabled={!hasValue} onClick={onClose}>
        Guardar Textura
      </button>
    </>
  );
}
