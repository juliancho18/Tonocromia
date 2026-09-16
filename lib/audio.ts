import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { Readable } from "stream";

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
ffmpeg.setFfprobePath(ffprobeStatic.path);

export interface TranscodeResult {
  buffer: Buffer;
  durationMs: number;
  contentType: string;
}

// Transcodes to mono MP3 at a bitrate that scales down for longer sources, so
// a single heavy upload can't blow past the app's 10-minute total audio
// budget on its own. MP3 (not raw AAC/ADTS) is deliberate: Firefox has no
// decoder for a bare ADTS elementary stream outside an MP4 container, so
// fragments transcoded to it played back silently there — MP3 plays
// everywhere <audio> is supported, including on the mobile browsers this app
// targets.
export async function transcodeAndProbe(input: Buffer): Promise<TranscodeResult> {
  const probedSeconds = await probeDurationSeconds(input);
  const bitrate = probedSeconds > 120 ? "48k" : "64k";

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = ffmpeg(Readable.from(input))
      .audioChannels(1)
      .audioBitrate(bitrate)
      .audioCodec("libmp3lame")
      .format("mp3")
      .on("error", reject)
      .pipe();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

  // Re-probing the transcoded buffer is unreliable for headerless streams in
  // general, so duration is carried over from the source instead — transcoding
  // doesn't change it.
  const durationMs = Math.round(probedSeconds * 1000);
  return { buffer, durationMs, contentType: "audio/mpeg" };
}

function probeDurationSeconds(input: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(input);
    ffmpeg.ffprobe(stream as unknown as string, (err, data) => {
      if (err) return reject(err);
      const duration = Number(data.format.duration);
      resolve(Number.isFinite(duration) ? duration : 0);
    });
  });
}
