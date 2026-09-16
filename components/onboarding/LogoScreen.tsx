"use client";

import Link from "next/link";
import { SkinToggle } from "@/components/skin/SkinToggle";

export function LogoScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="onb">
      <div />
      <div className="onb-mid">
        <div className="logo">
          <span className="logo-bold">Tono</span>
          <span className="logo-light">cromía</span>
        </div>
        <p className="onb-subtitle">Escúchalo en colores</p>
        <div className="onb-aura" />
        <SkinToggle />
      </div>
      <button className="onb-btn" onClick={onNext}>Continuar</button>
      <Link href="/panel" className="admin-link">Panel del investigador</Link>
    </div>
  );
}
