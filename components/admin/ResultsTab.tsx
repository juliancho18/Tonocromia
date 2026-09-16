"use client";

import { useEffect, useState } from "react";
import type { AdminResultRow } from "@/lib/types";

export function ResultsTab() {
  const [results, setResults] = useState<AdminResultRow[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/results");
    setLoading(false);
    if (!res.ok) { setError("No se pudo conectar para traer los resultados."); return; }
    setResults(await res.json());
  }

  useEffect(() => {
    // Initial fetch on mount — `load` is also reused as the manual "Actualizar" button.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const byParticipant = new Map<string, AdminResultRow[]>();
  (results ?? []).forEach(row => {
    const list = byParticipant.get(row.alias) ?? [];
    list.push(row);
    byParticipant.set(row.alias, list);
  });

  return (
    <div>
      <div className="results-toolbar">
        <button onClick={load}>{loading ? "Cargando…" : "Actualizar"}</button>
        <a className="secondary" href="/api/admin/results/csv">Exportar CSV</a>
      </div>

      {error && <div className="admin-empty">{error}</div>}
      {!error && results !== null && results.length === 0 && (
        <div className="admin-empty">Todavía no hay respuestas registradas.</div>
      )}
      {!error && [...byParticipant.entries()].map(([alias, rows]) => (
        <div className="participant-card" key={alias}>
          <div className="pname">{alias}</div>
          {rows.map(r => (
            <div className="frag-result-row" key={r.fragment_id}>
              <b>{r.fragment_id}</b>
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
