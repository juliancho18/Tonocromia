"use client";

import { useEffect, useState } from "react";
import type { Fragment, FragmentResponse } from "@/lib/types";
import { LogoScreen } from "@/components/onboarding/LogoScreen";
import { AliasScreen } from "@/components/onboarding/AliasScreen";
import { IntroScreen } from "@/components/onboarding/IntroScreen";
import { ThanksScreen } from "@/components/onboarding/ThanksScreen";
import { AudioCarousel } from "@/components/player/AudioCarousel";
import { Sheet, type PanelType } from "@/components/panels/Sheet";

type Screen = "loading" | "logo" | "apodo" | "intro" | "flow" | "thanks";

export default function ParticipantPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [alias, setAlias] = useState("");
  const [responses, setResponses] = useState<FragmentResponse[]>([]);
  const [openPanel, setOpenPanel] = useState<{ fragIndex: number; type: PanelType } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/fragments")
      .then(r => r.json())
      .then((data: Fragment[]) => {
        setFragments(data);
        setResponses(data.map(f => ({ fragmentId: f.id, colors: [], emotion: null, texture: null })));
        setScreen("logo");
      })
      .catch(() => setScreen("logo"));
  }, []);

  function handleUpdateResponse(fragIndex: number, patch: Partial<FragmentResponse>) {
    setResponses(prev => prev.map((r, i) => (i === fragIndex ? { ...r, ...patch } : r)));
  }

  async function handleSend() {
    setSending(true);
    try {
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias, responses }),
      });
    } catch {
      // The participant still sees the thanks screen; if the network truly
      // failed the investigator will notice a missing submission and can
      // ask the participant to retry from the same device.
    }
    setSending(false);
    setScreen("thanks");
  }

  if (screen === "loading") return <div className="onb" />;
  if (screen === "logo") return <LogoScreen onNext={() => setScreen("apodo")} />;
  if (screen === "apodo") {
    return (
      <AliasScreen
        onNext={a => { setAlias(a); setScreen("intro"); }}
      />
    );
  }
  if (screen === "intro") {
    return <IntroScreen fragmentCount={fragments.length} onNext={() => setScreen("flow")} />;
  }
  if (screen === "thanks") return <ThanksScreen />;

  return (
    <>
      <AudioCarousel
        fragments={fragments}
        responses={responses}
        onOpenPanel={(fragIndex, type) => setOpenPanel({ fragIndex, type })}
        onSend={handleSend}
        sending={sending}
      />
      <Sheet
        open={!!openPanel}
        type={openPanel?.type ?? null}
        response={openPanel ? responses[openPanel.fragIndex] : undefined}
        onUpdate={patch => { if (openPanel) handleUpdateResponse(openPanel.fragIndex, patch); }}
        onClose={() => setOpenPanel(null)}
      />
    </>
  );
}
