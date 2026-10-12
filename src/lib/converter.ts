import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export interface ConvertOptions {
  startTime: number;
  endTime: number;
  fps?: number;
  width?: number;
  isSquare?: boolean;
  onProgress?: (progress: number) => void;
}

export async function convertVideoToGif(
  video: HTMLVideoElement,
  options: ConvertOptions
): Promise<Blob> {
  // Capturar desde un archivo completo evita depender de los seeks HTTP del CDN
  // y de los eventos/controles del reproductor de la vista previa.
  const response = await fetch(video.currentSrc || video.src, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error('No se pudo descargar el video para convertirlo');
  const source = await response.blob();
  const objectUrl = URL.createObjectURL(source);
  const captureVideo = document.createElement('video');
  captureVideo.muted = true;
  captureVideo.playsInline = true;
  captureVideo.preload = 'auto';

  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        captureVideo.removeEventListener('loadeddata', onLoaded);
        captureVideo.removeEventListener('error', onError);
      };
      const onLoaded = () => { cleanup(); resolve(); };
      const onError = () => {
        cleanup();
        reject(new Error('No se pudo decodificar el video'));
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('El video no terminó de cargar. Intentá nuevamente.'));
      }, 15_000);
      captureVideo.addEventListener('loadeddata', onLoaded);
      captureVideo.addEventListener('error', onError);
      captureVideo.src = objectUrl;
      captureVideo.load();
    });
    return await encodeVideoToGif(captureVideo, options);
  } finally {
    captureVideo.pause();
    captureVideo.removeAttribute('src');
    captureVideo.load();
    URL.revokeObjectURL(objectUrl);
  }
}

async function encodeVideoToGif(
  video: HTMLVideoElement,
  options: ConvertOptions
): Promise<Blob> {
  const {
    startTime,
    endTime,
    fps = 12,
    width = 360,
    isSquare = true,
    onProgress,
  } = options;

  const duration = endTime - startTime;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(startTime) || startTime < 0 || endTime > video.duration) {
    throw new Error('Seleccioná un fragmento válido dentro del video');
  }
  if (!Number.isFinite(fps) || fps <= 0 || !Number.isInteger(width) || width <= 0) {
    throw new Error('La resolución y los FPS deben ser mayores a 0');
  }

  // Dimensiones del lienzo
  let renderWidth = width;
  let renderHeight = width;

  if (!isSquare) {
    const videoRatio = (video.videoWidth || 16) / (video.videoHeight || 9);
    renderWidth = width;
    renderHeight = Math.round(width / videoRatio);
    // Asegurar números pares para encoders
    if (renderHeight % 2 !== 0) renderHeight++;
  }

  const canvas = document.createElement('canvas');
  canvas.width = renderWidth;
  canvas.height = renderHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D del Canvas');
  }

  const gif = GIFEncoder();
  const frameInterval = 1 / fps;
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  let currentFrame = 0;

  // Función para esperar a que el video salte al segundo exacto
  const seekTo = (time: number): Promise<void> => {
    if (!video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - time) < 0.001) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('loadeddata', onSeeked);
        video.removeEventListener('error', onError);
      };
      const onSeeked = () => {
        if (!video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - time) < 0.001) {
          cleanup();
          resolve();
        }
      };
      const onError = () => {
        cleanup();
        reject(new Error('No se pudo decodificar un fotograma del video'));
      };
      // Un timeout es un error: nunca codificar el cuadro anterior como si fuera el nuevo.
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('No se pudo cargar un fotograma. Intentá nuevamente.'));
      }, 15_000);
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('loadeddata', onSeeked);
      video.addEventListener('error', onError);
      try {
        video.currentTime = time;
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  };

  // Pausar video durante la captura frame a frame
  video.pause();

  // El extremo final queda excluido: no capturar EOF ni disparar el bucle de preview.
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = startTime + frame * frameInterval;
    await seekTo(t);

    ctx.clearRect(0, 0, renderWidth, renderHeight);

    if (isSquare) {
      // Recorte centrado 1:1 estilo Sticker de WhatsApp
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const minDim = Math.min(vw, vh);
      const sx = (vw - minDim) / 2;
      const sy = (vh - minDim) / 2;

      ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, renderWidth, renderHeight);
    } else {
      ctx.drawImage(video, 0, 0, renderWidth, renderHeight);
    }

    const imgData = ctx.getImageData(0, 0, renderWidth, renderHeight);
    const data = imgData.data;

    // Reducción de color a paleta de 256 colores para máximo rendimiento y poco peso
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);

    gif.writeFrame(index, renderWidth, renderHeight, {
      palette,
      delay: Math.round(1000 / fps),
    });

    currentFrame++;
    if (onProgress) {
      const p = Math.min(100, Math.round((currentFrame / totalFrames) * 100));
      onProgress(p);
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

export async function captureCurrentFrame(
  video: HTMLVideoElement,
  isSquare = false
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 360;

  if (isSquare) {
    const minDim = Math.min(w, h);
    canvas.width = minDim;
    canvas.height = minDim;
    const ctx = canvas.getContext('2d')!;
    const sx = (w - minDim) / 2;
    const sy = (h - minDim) / 2;
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, minDim, minDim);
  } else {
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, w, h);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Error capturando imagen'));
    }, 'image/png');
  });
}
