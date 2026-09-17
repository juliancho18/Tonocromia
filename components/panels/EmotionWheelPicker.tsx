"use client";

import { useEffect, useRef, useState } from "react";
import { EMOTIONS } from "@/lib/constants";

interface EmotionWheelPickerProps {
  value: string | null;
  onChange: (emotion: string) => void;
  onClose: () => void;
}

const ROW_HEIGHT = 54;
// Mobile (iOS Safari especially) keeps firing scroll events with a
// not-yet-settled scrollTop during snap momentum, so reading the centered
// row on every frame picks the wrong one. Waiting until scrolling has
// actually stopped for a beat gives the real resting position instead.
const SETTLE_DELAY = 120;

// Report item 2.5: instead of the list itself scrolling into a checked state,
// a fixed "drawer" sits at the vertical center of the panel and the option
// that lands inside it as the user scrolls becomes the selection automatically.
export function EmotionWheelPicker({ value, onChange, onClose }: EmotionWheelPickerProps) {
  const [selected, setSelected] = useState<string | null>(value);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const container = scrollRef.current;
    const idx = value ? EMOTIONS.indexOf(value as (typeof EMOTIONS)[number]) : -1;
    if (container && idx >= 0) {
      container.scrollTop = idx * ROW_HEIGHT;
    }
  }, [value]);

  function commitFromScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const centerY = container.scrollTop + container.clientHeight / 2;
    const idx = Math.max(0, Math.min(EMOTIONS.length - 1, Math.round(centerY / ROW_HEIGHT - 0.5)));
    setSelected(EMOTIONS[idx]);
    onChange(EMOTIONS[idx]);
  }

  function handleScroll() {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(commitFromScroll, SETTLE_DELAY);
  }

  function selectEmotion(idx: number) {
    // Set the selection immediately from the tap itself, instead of only
    // relying on the scroll settling — on mobile the smooth-scroll's own
    // scroll events don't always land exactly on the snap point in time.
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    setSelected(EMOTIONS[idx]);
    onChange(EMOTIONS[idx]);
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
              onClick={() => selectEmotion(i)}
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
