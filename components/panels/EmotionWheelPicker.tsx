"use client";

import { useEffect, useRef, useState } from "react";
import { EMOTIONS } from "@/lib/constants";

interface EmotionWheelPickerProps {
  value: string | null;
  onChange: (emotion: string) => void;
  onClose: () => void;
}

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
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const idx = value ? EMOTIONS.indexOf(value as (typeof EMOTIONS)[number]) : -1;
    const row = idx >= 0 ? rowRefs.current[idx] : null;
    row?.scrollIntoView({ block: "center" });
  }, [value]);

  // Measures against the real, rendered positions of the drawer and the rows
  // instead of assuming a fixed row height — that assumption drifted from the
  // actual layout on some mobile browsers and left the wrong row selected.
  function commitFromScroll() {
    const drawer = drawerRef.current;
    if (!drawer) return;
    const drawerCenter = drawer.getBoundingClientRect().top + drawer.getBoundingClientRect().height / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    rowRefs.current.forEach((row, i) => {
      if (!row) return;
      const rect = row.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - drawerCenter);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });
    setSelected(EMOTIONS[closestIdx]);
    onChange(EMOTIONS[closestIdx]);
  }

  function handleScroll() {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(commitFromScroll, SETTLE_DELAY);
  }

  function selectEmotion(idx: number) {
    // Set the selection immediately from the tap itself, instead of only
    // relying on the scroll settling — on mobile the smooth-scroll's own
    // scroll events don't always land exactly on the snap point in time.
    // The jump is instant (not "smooth") on purpose: an animated scroll on
    // every tap made the list feel like it was constantly moving underneath
    // the user's finger while they were trying to fill out the form.
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    setSelected(EMOTIONS[idx]);
    onChange(EMOTIONS[idx]);
    rowRefs.current[idx]?.scrollIntoView({ block: "center" });
  }

  return (
    <>
      <button className="sheet-close" onClick={onClose}>✕</button>
      <div className="emotion-wheel">
        <div className="emotion-drawer" ref={drawerRef} aria-hidden="true" />
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
