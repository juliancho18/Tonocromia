"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminResultRow } from "@/lib/types";

export function ResultsTab() {
  const [results, setResults] = useState<AdminResultRow[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [alias, setAlias] = useState("");

  const load = useCallback(async (searchAlias: string) => {
    setLoading(true);
    setError("");
    const qs = searchAlias.trim() ? `?alias=${encodeURIComponent(searchAlias.trim())}` : "";
    const res = await fetch(`/api/admin/results${qs}`);
    setLoading(false);
    if (!res.ok) { setError("No se pudo conectar para traer los resultados."); return; }
    setResults(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load("");
  }, [load]);

  const byParticipant = new Map<string, AdminResultRow[]>();
  (results ?? []).forEach(row => {
    const list = byParticipant.get(row.alias) ?? [];
    list.push(row);
    byParticipant.set(row.alias, list);
  });

  return (
    <div>
      <div className="results-toolbar">
        <input
          className="results-search"
          type="text"
          placeholder="Buscar por apodo…"
          value={alias}
          onChange={e => setAlias(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") load(alias); }}
        />
        <button onClick={() => load(alias)}>{loading ? "Cargando…" : "Actualizar"}</button>
        <a className="secondary" href="/api/admin/results/csv">Exportar CSV</a>
      </div>

      {error && <div className="admin-empty">{error}</div>}
      {!error && results !== null && results.length === 0 && (
        <div className="admin-empty">
          {alias.trim() ? `Sin resultados para "${alias.trim()}".` : "Todavía no hay respuestas registradas."}
        </div>
      )}
      {!error && [...byParticipant.entries()].map(([participantAlias, rows]) => (
        <div className="participant-card" key={participantAlias}>
          <div className="pname">{participantAlias}</div>
          {rows.map(r => (
            <div className="frag-result-row" key={r.fragment_id}>
              <b>{r.fragment_label ?? r.fragment_id}</b>
              <div className="swatches">
                {r.colors.map((c, i) => <span key={i} style={{ background: c.hex }} />)}
              </div>
              <span>{r.emotion ?? "—"}</span>
              <span>·</span>
              <span>{r.texture ?? "—"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
