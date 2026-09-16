"use client";

import { useEffect, useRef } from "react";
import { buildWavePath, fallbackPeaks, livePeaksFromAnalyser } from "./waveform";

interface AudioCircleProps {
  index: number;
  size: number;
  translateX: number;
  scale: number;
  colorMix: number;
  isFocal: boolean;
  settling: boolean;
  hasAudio: boolean;
  registerAudioEl: (index: number, el: HTMLAudioElement | null) => void;
  audioSrc: string | null;
  isPlaying: boolean;
  onEnded: () => void;
  onTimeUpdate: (audio: HTMLAudioElement) => void;
}

// Owns one <audio> element and its audio-reactive doodle. The AnalyserNode is
// created lazily on first play (inside the user gesture, satisfying autoplay
// policies) and re-linked defensively on every render instead of assumed to
// still be alive, which is what let the original doodle get stuck (report
// item 2.4) if a fragment's graph silently failed to (re)connect.
export function AudioCircle({
  index, size, translateX, scale, colorMix, isFocal, settling, hasAudio,
  registerAudioEl, audioSrc, isPlaying, onEnded, onTimeUpdate,
}: AudioCircleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    registerAudioEl(index, audioRef.current);
    return () => registerAudioEl(index, null);
  }, [index, registerAudioEl]);

  useEffect(() => {
    if (!pathRef.current) return;
    pathRef.current.setAttribute("d", buildWavePath(fallbackPeaks(index)));
  }, [index]);

  useEffect(() => {
    let cancelled = false;
    function tick() {
      const audio = audioRef.current;
      const path = pathRef.current;
      if (!audio || !path) return;
      if (isFocal && !audio.paused && analyserRef.current) {
        path.setAttribute("d", buildWavePath(livePeaksFromAnalyser(analyserRef.current)));
      } else if (audio.paused) {
        path.setAttribute("d", buildWavePath(fallbackPeaks(index)));
      }
      if (!cancelled) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [index, isFocal]);

  function ensureAnalyser() {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctxHolder = (window as unknown as { __tonocromiaAudioCtx?: AudioContext });
      if (!ctxHolder.__tonocromiaAudioCtx) ctxHolder.__tonocromiaAudioCtx = new Ctx();
      const ctx = ctxHolder.__tonocromiaAudioCtx;
      if (ctx.state === "suspended") ctx.resume();
      if (analyserRef.current) return;
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    } catch {
      // A MediaElementSource already exists for this element (StrictMode double
      // effect, or a previous mount) — the fallback doodle keeps working.
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      ensureAnalyser();
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const r = Math.round(17 + (189 - 17) * colorMix);

  return (
    <div
      className={`audio-circle ${settling ? "settling" : ""} ${isFocal ? "is-focal" : ""}`}
      data-idx={index}
      style={{
        width: size, height: size,
        background: `rgb(${r},${r},${r})`,
        zIndex: Math.round(20 - Math.min(1, Math.abs(colorMix)) * 10),
        transform: `translate(-50%,-50%) translateX(${translateX}px) scale(${scale})`,
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path ref={pathRef} />
      </svg>
      {!hasAudio && <div className="audio-msg">Sin audio cargado todavía</div>}
      {audioSrc && (
        <audio
          ref={audioRef}
          preload="metadata"
          src={audioSrc}
          onEnded={onEnded}
          onTimeUpdate={e => onTimeUpdate(e.currentTarget)}
        />
      )}
    </div>
  );
}
