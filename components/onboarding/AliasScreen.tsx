"use client";

import { useState } from "react";

export function AliasScreen({ onNext }: { onNext: (alias: string) => void }) {
  const [alias, setAlias] = useState("");
  const [error, setError] = useState(false);

  function submit() {
    const trimmed = alias.trim();
    if (!trimmed) { setError(true); return; }
    onNext(trimmed);
  }

  return (
    <div className="onb">
      <div />
      <div className="onb-mid" style={{ width: "100%", alignItems: "center" }}>
        <h1>¡Bienvenido!</h1>
        <p>Escribe tu apodo</p>
        <input
          type="text" maxLength={40} placeholder="Apodo" value={alias}
          onChange={e => { setAlias(e.target.value); setError(false); }}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
        />
        {error && <div className="error-text">Escribe un apodo antes de continuar.</div>}
      </div>
      <button className="onb-btn" onClick={submit}>Continuar</button>
    </div>
  );
}
