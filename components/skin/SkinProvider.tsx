"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Skin = "editorial" | "futurista";
const STORAGE_KEY = "tonocromia_skin";

const SkinContext = createContext<{ skin: Skin; setSkin: (s: Skin) => void }>({
  skin: "editorial",
  setSkin: () => {},
});

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<Skin>("editorial");

  useEffect(() => {
    // Reads a per-device preference the participant/investigator chose on a
    // previous visit — not derivable from props, so this one-time sync on
    // mount is the correct use of an effect (not a fetch-in-render anti-pattern).
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "editorial" || stored === "futurista") setSkinState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.skin = skin;
  }, [skin]);

  function setSkin(next: Skin) {
    setSkinState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return <SkinContext.Provider value={{ skin, setSkin }}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  return useContext(SkinContext);
}
