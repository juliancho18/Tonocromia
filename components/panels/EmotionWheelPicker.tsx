"use client";

import { useEffect, useRef, useState } from "react";
import { EMOTIONS } from "@/lib/constants";

interface EmotionWheelPickerProps {
  value: string | null;
  onChange: (emotion: string) => void;
  onClose: () => void;
}

const ROW_HEIGHT = 54;

// Report item 2.5: instead of the list itself scrolling into a checked state,
// a fixed "drawer" sits at the vertical center of the panel and the option
// that lands inside it as the user scrolls becomes the selection automatically.
export function EmotionWheelPicker({ value, onChange, onClose }: EmotionWheelPickerProps) {
  const [selected, setSelected] = useState<string | null>(value);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const container = scrollRef.current;
    const idx = value ? EMOTIONS.indexOf(value as (typeof EMOTIONS)[number]) : -1;
    if (container && idx >= 0) {
      container.scrollTop = idx * ROW_HEIGHT;
    }
  }, [value]);

  function handleScroll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      const centerY = container.scrollTop + container.clientHeight / 2;
      const idx = Math.max(0, Math.min(EMOTIONS.length - 1, Math.round(centerY / ROW_HEIGHT - 0.5)));
      const emotion = EMOTIONS[idx];
      setSelected(emotion);
      onChange(emotion);
    });
  }

  function scrollToIndex(idx: number) {
    scrollRef.current?.scrollTo({ top: idx * ROW_HEIGHT, behavior: "smooth" });
  }

  return (
    <>
      <button className="sheet-close" onClick={onClose}>✕</button>
      <div className="emotion-wheel">
        <div className="emotion-drawer" aria-hidden="true" />
        <div className="emotion-wheel-scroll" ref={scrollRef} onScroll={handleScroll}>
          <div className="emotion-wheel-pad" />
          {EMOTIONS.map((em, i) => (
            <div
              key={em}
              ref={el => { rowRefs.current[i] = el; }}
              className={`emotion-row ${selected === em ? "selected" : ""}`}
              onClick={() => scrollToIndex(i)}
            >
              {em}
            </div>
          ))}
          <div className="emotion-wheel-pad" />
        </div>
      </div>
      <button className={`sheet-save-btn ${selected ? "ready" : ""}`} disabled={!selected} onClick={onClose}>
        Guardar Emoción
      </button>
    </>
  );
}
