"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminFragment } from "@/lib/types";
import { MAX_TOTAL_DURATION_MS } from "@/lib/duration";

function formatMs(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function FragmentsTab() {
  const [fragments, setFragments] = useState<AdminFragment[]>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/fragments");
    if (res.ok) setFragments(await res.json());
  }, []);

  useEffect(() => {
    // Initial fetch on mount — `load` is also reused as the manual "Actualizar"
    // action, so it stays a named function rather than an inline effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const activeTotalMs = fragments.filter(f => f.active).reduce((sum, f) => sum + f.duration_ms, 0);
  const overLimit = activeTotalMs > MAX_TOTAL_DURATION_MS;

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    const res = await fetch("/api/admin/fragments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo actualizar el fragmento.");
      return;
    }
    load();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = fragments.findIndex(f => f.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= fragments.length) return;
    const a = fragments[idx], b = fragments[swapIdx];
    await Promise.all([
      patch(a.id, { orderIndex: b.order_index }),
      patch(b.id, { orderIndex: a.order_index }),
    ]);
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar este fragmento? Esta acción no se puede deshacer.")) return;
    setError("");
    const res = await fetch("/api/admin/fragments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { setError("No se pudo borrar el fragmento."); return; }
    load();
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("label", file.name.replace(/\.[^.]+$/, ""));
    const res = await fetch("/api/admin/fragments", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo subir el audio.");
      return;
    }
    load();
  }

  return (
    <div>
      <div className="admin-card">
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 8px" }}>
          Arrastra un audio para agregarlo. Usa las flechas para reordenar, el interruptor para activar/desactivar,
          el nombre para renombrar, y &quot;Borrar&quot; para quitarlo definitivamente.
        </p>
        <div className="duration-meter">
          <div className="duration-meter-label">
            <span>Duración total activa</span>
            <span>{formatMs(activeTotalMs)} / {formatMs(MAX_TOTAL_DURATION_MS)}</span>
          </div>
          <div className="duration-meter-bar">
            <div
              className={`duration-meter-fill ${overLimit ? "over" : ""}`}
              style={{ width: `${Math.min(100, (activeTotalMs / MAX_TOTAL_DURATION_MS) * 100)}%` }}
            />
          </div>
        </div>
        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
        >
          {uploading ? "Subiendo y comprimiendo…" : "Arrastra un audio aquí, o toca para elegir un archivo"}
          <input
            ref={fileInputRef} type="file" accept="audio/*"
            onChange={e => { const file = e.target.files?.[0]; if (file) uploadFile(file); e.target.value = ""; }}
          />
        </div>
        {error && <div className="admin-error">{error}</div>}
      </div>

      {fragments.length === 0 && <div className="admin-empty">Todavía no hay fragmentos cargados.</div>}

      {fragments.map((f, i) => (
        <div className="admin-card frag-manage-row" key={f.id}>
          <div className="frag-manage-label">
            <input
              value={f.label}
              onChange={e => setFragments(prev => prev.map(x => (x.id === f.id ? { ...x, label: e.target.value } : x)))}
              onBlur={e => patch(f.id, { label: e.target.value })}
            />
            <span className="tag">
              {f.audio_url ? `audio cargado · ${formatMs(f.duration_ms)}` : "sin audio todavía"} · {f.active ? "activo" : "inactivo"}
            </span>
          </div>
          <div className="reorder-btns">
            <button disabled={i === 0} onClick={() => move(f.id, -1)}>▲</button>
            <button disabled={i === fragments.length - 1} onClick={() => move(f.id, 1)}>▼</button>
          </div>
          <div className={`toggle ${f.active ? "on" : ""}`} onClick={() => patch(f.id, { active: !f.active })}>
            <div className="dot" />
          </div>
          <button className="frag-delete-btn" onClick={() => remove(f.id)}>Borrar</button>
        </div>
      ))}
    </div>
  );
}
