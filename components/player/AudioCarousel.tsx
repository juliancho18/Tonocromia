"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Fragment, FragmentResponse } from "@/lib/types";
import { isResponseComplete } from "@/lib/types";
import { AudioCircle } from "./AudioCircle";
import { TaskIcon } from "./TaskIcon";

interface AudioCarouselProps {
  fragments: Fragment[];
  responses: FragmentResponse[];
  onOpenPanel: (fragIndex: number, type: "color" | "emotion" | "texture") => void;
  onSend: () => void;
  sending: boolean;
}

function getUnit() {
  const w = Math.min(window.innerWidth, 480);
  return w * 0.66;
}

export function AudioCarousel({ fragments, responses, onOpenPanel, onSend, sending }: AudioCarouselProps) {
  const n = fragments.length;
  const [focal, setFocal] = useState(0);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [settling, setSettling] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubPct, setScrubPct] = useState(0);
  const [circleSize, setCircleSize] = useState(160);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const audioEls = useRef<Record<number, HTMLAudioElement | null>>({});
  const dragState = useRef({ dragging: false, startX: 0, startFocal: 0 });

  const registerAudioEl = useCallback((index: number, el: HTMLAudioElement | null) => {
    audioEls.current[index] = el;
  }, []);

  const recalcCircleSize = useCallback(() => {
    const maxW = Math.min(window.innerWidth, 480) * 0.82;
    const track = trackRef.current;
    if (!track) { setCircleSize(maxW); return; }
    const maxH = track.clientHeight * 0.88;
    setCircleSize(Math.max(80, Math.min(maxW, maxH)));
  }, []);

  useEffect(() => {
    recalcCircleSize();
    window.addEventListener("resize", recalcCircleSize);
    return () => window.removeEventListener("resize", recalcCircleSize);
  }, [recalcCircleSize]);

  useEffect(() => { recalcCircleSize(); }, [displayedIndex, recalcCircleSize]);

  function pauseAllExcept(idx: number) {
    Object.entries(audioEls.current).forEach(([i, el]) => {
      if (Number(i) !== idx) el?.pause();
    });
  }

  function goTo(idx: number) {
    const clamped = Math.max(0, Math.min(n - 1, idx));
    pauseAllExcept(clamped);
    setDisplayedIndex(clamped);
    setFocal(clamped);
    setIsPlaying(false);
  }

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { dragging: true, startX: e.clientX, startFocal: focal };
    setSettling(false);
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current.dragging) return;
    const unit = getUnit();
    let f = dragState.current.startFocal + (dragState.current.startX - e.clientX) / unit;
    const min = 0, max = n - 1;
    if (f < min) f = min + (f - min) * 0.35;
    if (f > max) f = max + (f - max) * 0.35;
    setFocal(f);
  }
  function endDrag() {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    const target = Math.max(0, Math.min(n - 1, Math.round(focal)));
    setSettling(true);
    goTo(target);
  }

  function togglePlay() {
    const el = audioEls.current[displayedIndex];
    if (!el) return;
    setIsPlaying(!isPlaying);
  }

  function seekFromClientX(clientX: number) {
    const el = audioEls.current[displayedIndex];
    const track = document.getElementById("audio-scrub");
    if (!el || !track || !el.duration) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = pct * el.duration;
    setScrubPct(pct * 100);
  }

  const isLast = displayedIndex === n - 1;
  const allDone = responses.every(isResponseComplete);
  const incompleteCount = responses.filter(r => !isResponseComplete(r)).length;
  const current = responses[displayedIndex];

  return (
    <div className="audio-carousel">
      <div className="audio-header">
        <div>{displayedIndex + 1}/{n}</div>
        <div>AUDIO</div>
      </div>
      <div className="audio-icons">
        <button className="a-icon" onClick={() => onOpenPanel(displayedIndex, "color")}>
          <TaskIcon type="color" done={current.colors.length > 0} />
          <span>COLOR</span>
        </button>
        <button className="a-icon" onClick={() => onOpenPanel(displayedIndex, "emotion")}>
          <TaskIcon type="emotion" done={!!current.emotion} />
          <span>EMOCIÓN</span>
        </button>
        <button className="a-icon" onClick={() => onOpenPanel(displayedIndex, "texture")}>
          <TaskIcon type="texture" done={!!current.texture} />
          <span>TEXTURA</span>
        </button>
      </div>
      <div
        ref={trackRef}
        className="audio-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {fragments.map((f, i) => {
          const d = i - focal;
          const ad = Math.min(1, Math.abs(d));
          return (
            <AudioCircle
              key={f.id}
              index={i}
              size={circleSize}
              translateX={d * getUnit()}
              scale={1 - 0.48 * ad}
              colorMix={ad}
              isFocal={i === displayedIndex}
              settling={settling}
              hasAudio={!!f.audio_url}
              audioSrc={f.audio_url}
              registerAudioEl={registerAudioEl}
              isPlaying={i === displayedIndex && isPlaying}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={el => {
                if (i === displayedIndex && el.duration) setScrubPct((el.currentTime / el.duration) * 100);
              }}
            />
          );
        })}
      </div>
      {isLast && (
        <div className="audio-send-wrap">
          <button className={`audio-send-btn ${allDone ? "ready" : ""}`} disabled={!allDone || sending} onClick={onSend}>
            {sending ? "Enviando…" : "Enviar respuestas"}
          </button>
          <div className="audio-send-note">
            {allDone ? "Todo listo. Al enviar, no podrás editar tus respuestas." : `Faltan ${incompleteCount} fragmento(s) por completar.`}
          </div>
        </div>
      )}
      <div className="audio-bottom">
        <div
          id="audio-scrub"
          className="audio-scrub"
          onPointerDown={e => seekFromClientX(e.clientX)}
          onPointerMove={e => { if (e.buttons === 1) seekFromClientX(e.clientX); }}
        >
          <div className="audio-scrub-fill" style={{ width: `${scrubPct}%` }} />
          <div className="audio-scrub-dot" style={{ left: `${scrubPct}%` }} />
        </div>
        <button className="audio-playpause" onClick={togglePlay}>
          {isPlaying ? "II" : "▶"}
        </button>
      </div>
    </div>
  );
}
