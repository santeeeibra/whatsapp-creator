// Genera un video corto (MP4 si el navegador lo soporta, si no WebM) con el
// fragmento recortado del video + el audio elegido, usando MediaRecorder.
// Sin dependencias: canvas.captureStream + Web Audio API + MediaRecorder.

export interface RenderVideoOptions {
  startTime: number;
  endTime: number;
  size?: number;
  fps?: number;
  onProgress?: (progress: number) => void;
}

export interface RenderVideoResult {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
}

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function pickRecorderMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export function canRecordMp4(): boolean {
  return pickRecorderMimeType()?.startsWith('video/mp4') ?? false;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener('seeked', finish);
      resolve();
    };
    video.addEventListener('seeked', finish);
    video.currentTime = time;
    setTimeout(finish, 1000);
  });
}

export async function renderVideoWithAudio(
  video: HTMLVideoElement,
  audioBlob: Blob,
  options: RenderVideoOptions
): Promise<RenderVideoResult> {
  const { startTime, endTime, size = 512, fps = 15, onProgress } = options;
  const clipDuration = endTime - startTime;
  if (clipDuration <= 0) throw new Error('La duración del clip debe ser mayor a 0');

  const mimeType = pickRecorderMimeType();
  if (!mimeType) {
    throw new Error('Tu navegador no permite grabar video. Probá con Chrome, Edge o Safari.');
  }
  const canvas = document.createElement('canvas');
  if (typeof canvas.captureStream !== 'function') {
    throw new Error('Tu navegador no permite grabar video desde el canvas.');
  }

  canvas.width = size;
  canvas.height = size;
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) throw new Error('No se pudo inicializar el contexto 2D del Canvas');

  const drawFrame = () => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    const minDim = Math.min(vw, vh);
    const sx = (vw - minDim) / 2;
    const sy = (vh - minDim) / 2;
    ctx2d.fillStyle = '#000';
    ctx2d.fillRect(0, 0, size, size);
    ctx2d.drawImage(video, sx, sy, minDim, minDim, 0, 0, size, size);
  };

  // Audio: decodificar y enviarlo solo al stream de grabación (no a los parlantes).
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error('Tu navegador no soporta procesamiento de audio.');
  const audioCtx = new AudioCtx();

  const prevMuted = video.muted;
  const canvasStream = canvas.captureStream(fps);
  let audioSource: AudioBufferSourceNode | null = null;

  try {
    const audioBuffer = await audioCtx.decodeAudioData(await audioBlob.arrayBuffer());
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const destination = audioCtx.createMediaStreamDestination();
    audioSource = audioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(destination);

    const stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 1_500_000,
      audioBitsPerSecond: 128_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const stopped = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error('Falló la grabación del video.'));
    });

    // Preparar el video: silenciado y posicionado en el inicio del recorte.
    video.pause();
    video.muted = true;
    await seekTo(video, startTime);
    drawFrame();

    recorder.start(100);
    audioSource.start(0, 0, Math.min(clipDuration, audioBuffer.duration));
    await video.play();

    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        drawFrame();
        const elapsed = (performance.now() - t0) / 1000;
        onProgress?.(Math.min(100, Math.round((elapsed / clipDuration) * 100)));
        if (elapsed >= clipDuration || video.currentTime >= endTime || video.ended) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    video.pause();
    recorder.stop();
    await stopped;

    const baseType = mimeType.split(';')[0];
    const blob = new Blob(chunks, { type: baseType });
    if (blob.size === 0) throw new Error('La grabación quedó vacía. Probá de nuevo.');

    return {
      blob,
      mimeType: baseType,
      extension: baseType === 'video/mp4' ? 'mp4' : 'webm',
    };
  } finally {
    try {
      audioSource?.stop();
    } catch {
      // ya estaba detenido
    }
    canvasStream.getTracks().forEach((t) => t.stop());
    audioCtx.close().catch(() => {});
    video.pause();
    video.muted = prevMuted;
    video.currentTime = startTime;
  }
}
