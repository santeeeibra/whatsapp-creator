// Utilidades de audio para stickers (100% navegador, sin dependencias).
// Usa la Web Audio API para decodificar, recortar y exportar a WAV.

export const MAX_VIDEO_AUDIO_SECONDS = 5;
export const MAX_UPLOAD_AUDIO_SECONDS = 10;
export const ACCEPTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a'];

export interface StickerAudio {
  blob: Blob;
  url: string;
  source: 'video' | 'file';
  label: string;
  duration: number;
}

function getAudioContextClass(): typeof AudioContext {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('Tu navegador no soporta procesamiento de audio.');
  return Ctx;
}

async function decode(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const Ctx = getAudioContextClass();
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    ctx.close().catch(() => {});
  }
}

/** Codifica un AudioBuffer (o un tramo) como WAV PCM 16 bits. */
export function encodeWav(buffer: AudioBuffer, startSec = 0, endSec = buffer.duration): Blob {
  const sampleRate = buffer.sampleRate;
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(buffer.length, Math.floor(endSec * sampleRate));
  const frameCount = Math.max(0, endSample - startSample);

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = startSample; i < endSample; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

/**
 * Extrae el audio del video entre start y end (máx. 5 s) y lo devuelve como WAV.
 * Si el tramo supera el máximo, se toman los primeros 5 s desde el inicio.
 */
export async function extractAudioFromVideo(
  videoSrc: string,
  startTime: number,
  endTime: number
): Promise<{ blob: Blob; duration: number; truncated: boolean }> {
  const res = await fetch(videoSrc);
  if (!res.ok) throw new Error('No se pudo leer el video para extraer el audio.');
  const arrayBuffer = await res.arrayBuffer();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await decode(arrayBuffer);
  } catch {
    throw new Error('Este video no tiene audio o el formato no se puede leer en el navegador.');
  }

  const start = Math.max(0, Math.min(startTime, audioBuffer.duration));
  const requestedEnd = Math.min(endTime, audioBuffer.duration);
  if (requestedEnd - start <= 0) {
    throw new Error('El fragmento seleccionado no tiene audio.');
  }
  const truncated = requestedEnd - start > MAX_VIDEO_AUDIO_SECONDS;
  const end = truncated ? start + MAX_VIDEO_AUDIO_SECONDS : requestedEnd;

  const blob = encodeWav(audioBuffer, start, end);
  return { blob, duration: end - start, truncated };
}

/** Lee la duración (en segundos) de un archivo de audio. */
export function getAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      URL.revokeObjectURL(url);
      if (Number.isFinite(d)) resolve(d);
      else reject(new Error('No se pudo leer la duración del audio.'));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer el archivo de audio.'));
    };
    audio.src = url;
  });
}

export function isAcceptedAudioFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ACCEPTED_AUDIO_EXTENSIONS.includes(ext);
}
