"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { FragmentsTab } from "@/components/admin/FragmentsTab";
import { ResultsTab } from "@/components/admin/ResultsTab";

type AuthState = "checking" | "out" | "in";

export default function PanelPage() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [tab, setTab] = useState<"resultados" | "fragmentos">("resultados");

  useEffect(() => {
    fetch("/api/admin/fragments").then(res => setAuth(res.ok ? "in" : "out"));
  }, []);

  if (auth === "checking") return <div className="admin-wrap" />;
  if (auth === "out") return <AdminLogin onSuccess={() => setAuth("in")} />;

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h1>Panel del investigador</h1>
        <Link href="/" className="admin-back">Volver</Link>
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
