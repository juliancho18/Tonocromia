"use client";

import { useSkin } from "./SkinProvider";

export function SkinToggle() {
  const { skin, setSkin } = useSkin();
  return (
    <div className="skin-toggle" role="group" aria-label="Elegir estilo visual">
      <div className={`thumb ${skin === "futurista" ? "on-futurista" : ""}`} />
      <button type="button" className={skin === "editorial" ? "active" : ""} onClick={() => setSkin("editorial")}>
        Claro
      </button>
      <button type="button" className={skin === "futurista" ? "active" : ""} onClick={() => setSkin("futurista")}>
        Oscuro
      </button>
    </div>
  );
}
