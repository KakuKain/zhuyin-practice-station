import { maxRecordingSeconds } from "./custom-audio";

type Callbacks = {
  status: (status: "waiting" | "recording" | "processing") => void;
  ready: (blob: Blob) => void;
  error: (error: unknown) => void;
};
type Dependencies = {
  getStream: () => Promise<MediaStream>;
  makeRecorder: (stream: MediaStream) => MediaRecorder;
};

export function makeBrowserRecorder(stream: MediaStream): MediaRecorder {
  if (typeof MediaRecorder === "undefined")
    throw new Error("這個瀏覽器不支援錄音，請匯入音檔或使用新版瀏覽器。");
  const mimeType = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type));
  return new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
}

/** Owns microphone lifetime, including permission arriving after cancellation. */
export function createRecordingSession(callbacks: Callbacks, dependencies?: Dependencies) {
  let generation = 0;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let limit: ReturnType<typeof setTimeout> | undefined;
  let permissionLimit: ReturnType<typeof setTimeout> | undefined;
  const release = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };
  const cancel = () => {
    generation += 1;
    clearTimeout(limit);
    clearTimeout(permissionLimit);
    if (recorder?.state === "recording") recorder.stop();
    recorder = null;
    release();
  };
  const stop = () => {
    if (recorder?.state !== "recording") return;
    clearTimeout(limit);
    callbacks.status("processing");
    recorder.stop();
    release();
  };
  const start = async () => {
    cancel();
    const token = generation;
    callbacks.status("waiting");
    permissionLimit = setTimeout(() => {
      if (token !== generation) return;
      cancel();
      callbacks.error(new Error("還沒取得麥克風權限。請允許權限後再按一次，或匯入音檔。"));
    }, 25000);
    try {
      if (!dependencies && !navigator.mediaDevices?.getUserMedia)
        throw new Error("這個瀏覽器無法開啟麥克風，請匯入音檔或使用 HTTPS 網站。");
      const nextStream = await (dependencies?.getStream() ??
        navigator.mediaDevices.getUserMedia({ audio: true }));
      if (token !== generation) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      clearTimeout(permissionLimit);
      stream = nextStream;
      const nextRecorder = dependencies
        ? dependencies.makeRecorder(stream)
        : makeBrowserRecorder(stream);
      recorder = nextRecorder;
      const chunks: Blob[] = [];
      nextRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      nextRecorder.onerror = () => {
        if (token !== generation) return;
        cancel();
        callbacks.error(new Error("錄音中斷，請重新錄製。"));
      };
      nextRecorder.onstop = () => {
        if (token !== generation) return;
        release();
        recorder = null;
        callbacks.ready(
          new Blob(chunks, { type: nextRecorder.mimeType || chunks[0]?.type || "audio/webm" }),
        );
      };
      nextRecorder.start();
      callbacks.status("recording");
      limit = setTimeout(stop, maxRecordingSeconds * 1000);
    } catch (error) {
      if (token !== generation) return;
      cancel();
      callbacks.error(error);
    }
  };
  return { start, stop, cancel };
}

/** Decode without playing; metadata duration is often Infinity in recorder WebM files. */
export async function audioDuration(blob: Blob): Promise<number> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    return decoded.duration;
  } catch {
    throw new Error("這個音檔無法讀取，請重新錄製，或改用 M4A、MP3、WAV。");
  } finally {
    await context.close();
  }
}

/** Conservative edge-only trim: quiet speech is retained, interior pauses untouched. */
export function silenceBounds(samples: Float32Array, sampleRate: number): [number, number] {
  const frame = Math.max(1, Math.floor(sampleRate * 0.02));
  const levels: number[] = [];
  for (let offset = 0; offset < samples.length; offset += frame) {
    let sum = 0;
    const end = Math.min(samples.length, offset + frame);
    for (let index = offset; index < end; index++) sum += samples[index] ** 2;
    levels.push(Math.sqrt(sum / (end - offset)));
  }
  const peak = levels.reduce((max, level) => Math.max(max, level), 0);
  if (peak < 0.008) return [0, samples.length];
  const threshold = Math.max(0.001, peak * 0.015);
  const first = levels.findIndex((level) => level > threshold);
  let last = levels.length - 1;
  while (last > first && levels[last] <= threshold) last--;
  const padding = Math.floor(sampleRate * 0.3);
  return [
    Math.max(0, first * frame - padding),
    Math.min(samples.length, (last + 1) * frame + padding),
  ];
}

export async function trimRecordingSilence(blob: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const mono = new Float32Array(buffer.length);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let index = 0; index < mono.length; index++)
        mono[index] += samples[index] / buffer.numberOfChannels;
    }
    const [start, end] = silenceBounds(mono, buffer.sampleRate);
    if ((end - start) / buffer.sampleRate < 0.5 || (start === 0 && end === mono.length))
      return blob;
    const bytes = new ArrayBuffer(44 + (end - start) * 2);
    const view = new DataView(bytes);
    const label = (offset: number, text: string) => {
      for (let index = 0; index < text.length; index++)
        view.setUint8(offset + index, text.charCodeAt(index));
    };
    label(0, "RIFF");
    view.setUint32(4, bytes.byteLength - 8, true);
    label(8, "WAVE");
    label(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    label(36, "data");
    view.setUint32(40, bytes.byteLength - 44, true);
    for (let index = start; index < end; index++) {
      const sample = Math.max(-1, Math.min(1, mono[index]));
      view.setInt16(
        44 + (index - start) * 2,
        Math.round(sample * (sample < 0 ? 32768 : 32767)),
        true,
      );
    }
    return new Blob([bytes], { type: "audio/wav" });
  } catch {
    // Unsupported decoding must never discard the original take.
    return blob;
  } finally {
    await context.close();
  }
}
