"use client";

import { useEffect } from "react";
import type { FragmentResponse } from "@/lib/types";
import { ColorWheelPanel } from "./ColorWheelPanel";
import { EmotionWheelPicker } from "./EmotionWheelPicker";
import { TexturePanel } from "./TexturePanel";

export type PanelType = "color" | "emotion" | "texture";

interface SheetProps {
  open: boolean;
  type: PanelType | null;
  response: FragmentResponse | undefined;
  onUpdate: (patch: Partial<FragmentResponse>) => void;
  onClose: () => void;
}

export function Sheet({ open, type, response, onUpdate, onClose }: SheetProps) {
  useEffect(() => {
    document.body.classList.toggle("panel-open", open);
    return () => document.body.classList.remove("panel-open");
  }, [open]);

  const isLight = type === "emotion" || type === "texture" || type === "color";

  return (
    <>
      <div className={`sheet-backdrop ${open ? "open" : ""} ${isLight ? "backdrop-light" : ""}`} onClick={onClose} />
      <div className={`sheet ${open ? "open" : ""} ${isLight ? "sheet-light" : ""} ${type === "emotion" ? "no-title" : ""}`}>
        {response && type === "color" && (
          <ColorWheelPanel colors={response.colors} onChange={colors => onUpdate({ colors })} onClose={onClose} />
        )}
        {response && type === "emotion" && (
          <EmotionWheelPicker value={response.emotion} onChange={emotion => onUpdate({ emotion })} onClose={onClose} />
        )}
        {response && type === "texture" && (
          <TexturePanel value={response.texture} onChange={texture => onUpdate({ texture })} onClose={onClose} />
        )}
      </div>
    </>
  );
}
