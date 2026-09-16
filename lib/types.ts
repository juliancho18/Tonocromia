export interface Fragment {
  id: string;
  label: string;
  audio_url: string | null;
  duration_ms: number;
}

export interface AdminFragment extends Fragment {
  order_index: number;
  active: boolean;
}

export interface AdminResultRow {
  alias: string;
  submitted_at: string;
  fragment_id: string;
  fragment_label: string | null;
  colors: ColorEntry[];
  emotion: string | null;
  texture: string | null;
}

export interface ColorEntry {
  hue: number;
  saturation: number;
  lightness: number;
  hex: string;
}

export interface FragmentResponse {
  fragmentId: string;
  colors: ColorEntry[];
  emotion: string | null;
  texture: string | null;
}

export function isResponseComplete(r: FragmentResponse): boolean {
  return r.colors.length > 0 && !!r.emotion && !!r.texture;
}
