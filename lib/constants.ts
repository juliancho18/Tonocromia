export const MAX_COLORS = 5;

// Raw upload cap before transcoding. Uploads go straight from the browser to
// Vercel Blob (see /api/admin/fragments/blob-upload), so this isn't limited
// by the ~4.5MB request body cap on Vercel serverless functions — it's just
// a sane ceiling for a single audio fragment.
export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

export const ALLOWED_AUDIO_EXTENSIONS = [
  "mp3", "wav", "m4a", "aac", "ogg", "oga", "flac", "webm", "opus",
] as const;

export function isAllowedAudioFile(file: { name: string; type: string }): boolean {
  if (file.type.startsWith("audio/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(ext);
}

export const EMOTIONS = [
  "Plenitud", "Serenidad", "Resignación", "Añoranza", "Melancolía",
  "Desesperación", "Entusiasmo", "Empoderamiento", "Pánico", "Desorientación",
  "Alivio", "Impotencia", "Irritación", "Vulnerabilidad", "Magnetismo",
  "Seducción", "Apatía",
] as const;

export const TEXTURES = [
  "Suave / Terciopelado", "Cristalino / Afilado", "Áspero / Granulado",
  "Denso / Pesado", "Vibrante / Eléctrico", "Líquido / Fluido",
  "Eólico / Gaseoso", "Metálico / Escarchado",
] as const;

export const TEXTURE_OTHER_LABEL = "Otro";
