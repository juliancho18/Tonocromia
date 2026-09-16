"use client";

import { useState } from "react";
import Link from "next/link";

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) onSuccess();
    else setError(true);
  }

  return (
    <div className="onb">
      <Link href="/" className="onb-back-btn" aria-label="Volver">←</Link>
      <div />
      <div className="onb-mid" style={{ width: "100%", alignItems: "center" }}>
        <h1>Panel del investigador</h1>
        <p>Escribe la contraseña</p>
        <input
          type="password" placeholder="Contraseña" value={password}
          onChange={e => { setPassword(e.target.value); setError(false); }}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
        />
        {error && <div className="error-text">Contraseña incorrecta.</div>}
      </div>
      <button className="onb-btn" onClick={submit} disabled={loading}>Entrar</button>
    </div>
  );
}
