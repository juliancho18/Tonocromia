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

// Transcodes to a mono AAC/ADTS stream at a bitrate that scales down for
// longer sources, so a single heavy upload can't blow past the app's
// 10-minute total audio budget on its own.
export async function transcodeAndProbe(input: Buffer): Promise<TranscodeResult> {
  const probedSeconds = await probeDurationSeconds(input);
  const bitrate = probedSeconds > 120 ? "48k" : "64k";

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = ffmpeg(Readable.from(input))
      .audioChannels(1)
      .audioBitrate(bitrate)
      .format("adts")
      .on("error", reject)
      .pipe();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

  const durationMs = Math.round((await probeDurationSeconds(buffer)) * 1000);
  return { buffer, durationMs, contentType: "audio/aac" };
}

function probeDurationSeconds(input: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(input);
    ffmpeg.ffprobe(stream as unknown as string, (err, data) => {
      if (err) return reject(err);
      resolve(data.format.duration ?? 0);
    });
  });
}
