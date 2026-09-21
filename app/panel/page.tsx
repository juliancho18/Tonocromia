"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { FragmentsTab } from "@/components/admin/FragmentsTab";
import { ResultsTab } from "@/components/admin/ResultsTab";

type AuthState = "checking" | "out" | "in";

// Must stay below SESSION_TTL_MS (server-side inactivity window, 30 min).
const IDLE_LIMIT_MS = 25 * 60 * 1000;
const REFRESH_EVERY_MS = 5 * 60 * 1000;

export default function PanelPage() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [tab, setTab] = useState<"resultados" | "fragmentos">("resultados");

  useEffect(() => {
    fetch("/api/admin/fragments").then(res => setAuth(res.ok ? "in" : "out"));
  }, []);

  // Inactivity timeout: any interaction counts as work. While the admin is
  // active the session is refreshed on the server; after IDLE_LIMIT_MS with no
  // interaction (or if the server says the session lapsed) we sign out.
  useEffect(() => {
    if (auth !== "in") return;
    let lastActivity = Date.now();
    let lastRefresh = Date.now();
    const markActive = () => { lastActivity = Date.now(); };
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;
    events.forEach(e => window.addEventListener(e, markActive, { passive: true }));

    const tick = setInterval(async () => {
      const now = Date.now();
      if (now - lastActivity >= IDLE_LIMIT_MS) {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
        setAuth("out");
      } else if (lastActivity > lastRefresh && now - lastRefresh >= REFRESH_EVERY_MS) {
        lastRefresh = now;
        const res = await fetch("/api/admin/session", { method: "POST" }).catch(() => null);
        if (res && res.status === 401) setAuth("out");
      }
    }, 30_000);

    return () => {
      clearInterval(tick);
      events.forEach(e => window.removeEventListener(e, markActive));
    };
  }, [auth]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAuth("out");
  }

  if (auth === "checking") return <div className="admin-wrap" />;
  if (auth === "out") return <AdminLogin onSuccess={() => setAuth("in")} />;

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h1>Panel del investigador</h1>
        <div className="admin-header-actions">
          <Link href="/" className="admin-back">Volver</Link>
          <button type="button" className="admin-back" onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
      <div className="admin-tabs">
        <button className={`admin-tab-btn ${tab === "resultados" ? "active" : ""}`} onClick={() => setTab("resultados")}>
          Resultados
        </button>
        <button className={`admin-tab-btn ${tab === "fragmentos" ? "active" : ""}`} onClick={() => setTab("fragmentos")}>
          Fragmentos
        </button>
      </div>
      {tab === "resultados" ? <ResultsTab /> : <FragmentsTab />}
    </div>
  );
}
