"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_COLORS } from "@/lib/constants";
import { hslToHex } from "@/components/player/waveform";
import type { ColorEntry } from "@/lib/types";

interface ColorWheelPanelProps {
  colors: ColorEntry[];
  onChange: (colors: ColorEntry[]) => void;
  onClose: () => void;
}

export function ColorWheelPanel({ colors, onChange, onClose }: ColorWheelPanelProps) {
  const [picker, setPicker] = useState({ hue: 20, sat: 70, light: 55 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = 75, cy = 75, radius = 73;
    const img = ctx.createImageData(150, 150);
    for (let y = 0; y < 150; y++) {
      for (let x = 0; x < 150; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * 150 + x) * 4;
        if (dist > radius) { img.data[idx + 3] = 0; continue; }
        let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (hue < 0) hue += 360;
        const sat = Math.min(dist / radius, 1) * 100;
        const hexc = hslToHex(hue, sat, 55);
        img.data[idx] = parseInt(hexc.slice(1, 3), 16);
        img.data[idx + 1] = parseInt(hexc.slice(3, 5), 16);
        img.data[idx + 2] = parseInt(hexc.slice(5, 7), 16);
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  function pick(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = 75, cy = 75, radius = 73;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - cx, y = clientY - rect.top - cy;
    let dist = Math.sqrt(x * x + y * y);
    if (dist > radius) dist = radius;
    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    setPicker(p => ({ ...p, hue: angle, sat: (dist / radius) * 100 }));
  }

  const hex = hslToHex(picker.hue, picker.sat, picker.light);

  function addColor() {
    if (colors.length >= MAX_COLORS) return;
    onChange([
      ...colors,
      { hue: Math.round(picker.hue), saturation: Math.round(picker.sat), lightness: Math.round(picker.light), hex },
    ]);
  }
  function removeColor(i: number) {
    onChange(colors.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <button className="sheet-close" onClick={onClose}>✕</button>
      <div className="sheet-title">RUEDA CROMÁTICA</div>
      <div className="color-panel-body">
        <div className="wheel-row">
          <div className="wheel-glow">
            <canvas
              id="wheel"
              ref={canvasRef}
              width={150}
              height={150}
              onPointerDown={e => {
                draggingRef.current = true;
                (e.target as Element).setPointerCapture(e.pointerId);
                pick(e.clientX, e.clientY);
              }}
              onPointerMove={e => { if (draggingRef.current) pick(e.clientX, e.clientY); }}
              onPointerUp={() => { draggingRef.current = false; }}
            />
          </div>
          <div className="vslider-wrap">
            <label>Luz</label>
            <input
              type="range" className="vslider" min={0} max={100} value={picker.light}
              onChange={e => setPicker(p => ({ ...p, light: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="swatch-preview-row">
          <div className="swatch-preview" style={{ background: hex, boxShadow: `0 6px 20px ${hex}66` }} />
          <div>
            <div className="hex-label">{hex.toUpperCase()}</div>
            <div className="hint-text">toca la rueda para elegir un color</div>
          </div>
        </div>
        <button className="add-color-btn" disabled={colors.length >= MAX_COLORS} onClick={addColor}>
          {colors.length >= MAX_COLORS ? `Ya elegiste ${MAX_COLORS} colores` : "+ Agregar color a la paleta"}
        </button>
        <div className="palette-label">Tu paleta para este fragmento ({colors.length}/{MAX_COLORS})</div>
        <div className="chosen-row">
          {colors.map((c, i) => (
            <div className="chip-wrap" key={i}>
              <div className="chip" style={{ background: c.hex, boxShadow: `0 4px 14px ${c.hex}55` }}>
                <button className="rm" onClick={() => removeColor(i)}>✕</button>
              </div>
              <div className="chip-hex">{c.hex.toUpperCase()}</div>
            </div>
          ))}
          {Array.from({ length: MAX_COLORS - colors.length }).map((_, i) => (
            <div className="chip chip-empty" key={`empty-${i}`} />
          ))}
        </div>
      </div>
      <button className={`sheet-save-btn ${colors.length > 0 ? "ready" : ""}`} disabled={colors.length === 0} onClick={onClose}>
        Guardar paleta
      </button>
    </>
  );
}
