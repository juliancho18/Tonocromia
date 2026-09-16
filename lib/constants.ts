export const MAX_COLORS = 5;

// Raw upload cap before transcoding. Uploads go straight from the browser to
// Vercel Blob (see /api/admin/fragments/blob-upload), so this isn't limited
// by the ~4.5MB request body cap on Vercel serverless functions — it's just
// a sane ceiling for a single audio fragment.
export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

export const ALLOWED_AUDIO_EXTENSIONS = [
  "mp3", "wav", "m4a", "aac", "ogg", "oga", "flac", "webm", "opus",
  "amr", "wma", "aiff", "aif", "3gp", "caf", "mp4",
] as const;

// Video containers are accepted too: ffmpeg extracts and transcodes just the
// audio track, ignoring the video stream.
export const ALLOWED_VIDEO_EXTENSIONS = [
  "mov", "avi", "mkv", "wmv", "flv", "m4v",
] as const;

// Windows/browsers frequently report an empty or wrong `file.type` for these
// extensions, so the server-side Vercel Blob upload (which checks the actual
// content type, not the extension) needs an explicit fallback mime per ext.
const EXTENSION_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  webm: "audio/webm",
  opus: "audio/opus",
  amr: "audio/amr",
  wma: "audio/x-ms-wma",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  "3gp": "audio/3gpp",
  caf: "audio/x-caf",
  mp4: "audio/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  m4v: "video/x-m4v",
};

export function isAllowedAudioFile(file: { name: string; type: string }): boolean {
  if (file.type.startsWith("audio/") || file.type.startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (
    !!ext &&
    ((ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(ext) ||
      (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext))
  );
}

// Resolves the content type to send to Vercel Blob: trust the browser's
// reported type when it's audio/video, otherwise fall back to the extension map.
export function resolveAudioContentType(file: { name: string; type: string }): string {
  if (file.type.startsWith("audio/") || file.type.startsWith("video/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (ext && EXTENSION_TO_MIME[ext]) || "audio/mpeg";
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
