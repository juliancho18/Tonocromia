"use client";

import Link from "next/link";
import { SkinToggle } from "@/components/skin/SkinToggle";

// A handful of the same words the survey later asks about — floating faintly
// here previews what the app is about without competing with the logo.
const FLOATING_WORDS = [
  { word: "Serenidad", top: "10%", left: "10%", delay: "0s" },
  { word: "Melancolía", top: "16%", left: "72%", delay: "1.2s" },
  { word: "Vibrante", top: "38%", left: "84%", delay: "2.4s" },
  { word: "Añoranza", top: "62%", left: "6%", delay: "0.8s" },
  { word: "Cristalino", top: "72%", left: "78%", delay: "1.8s" },
  { word: "Plenitud", top: "84%", left: "22%", delay: "3s" },
];

export function LogoScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="onb">
      <div className="onb-float-words" aria-hidden="true">
        {FLOATING_WORDS.map(({ word, top, left, delay }) => (
          <span key={word} className="onb-float-word" style={{ top, left, animationDelay: delay }}>
            {word}
          </span>
        ))}
      </div>
      <div />
      <div className="onb-mid">
        <div className="logo">
          <span className="logo-bold">Tono</span>
          <span className="logo-light">cromía</span>
        </div>
        <p className="onb-subtitle">Escúchalo en colores</p>
        <div className="onb-aura-beat">
          <div className="onb-aura" />
        </div>
        <SkinToggle />
      </div>
      <button className="onb-btn" onClick={onNext}>Continuar</button>
      <Link href="/panel" className="admin-link">Panel del investigador</Link>
    </div>
  );
}
