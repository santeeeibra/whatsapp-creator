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
  const {
    startTime,
    endTime,
    fps = 12,
    width = 360,
    isSquare = true,
    onProgress,
  } = options;

  const duration = endTime - startTime;
  if (duration <= 0) {
    throw new Error('La duración del clip debe ser mayor a 0');
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
  const totalFrames = Math.max(1, Math.floor(duration * fps));
  let currentFrame = 0;

  // Función para esperar a que el video salte al segundo exacto
  const seekTo = (time: number): Promise<void> => {
    return new Promise((resolve) => {
      let resolved = false;
      const onSeeked = () => {
        if (!resolved) {
          resolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      };

      video.addEventListener('seeked', onSeeked);
      video.currentTime = Math.min(time, video.duration || time);

      // Timeout de seguridad por si el evento no dispara
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      }, 500);
    });
  };

  // Pausar video durante la captura frame a frame
  video.pause();

  for (let t = startTime; t <= endTime; t += frameInterval) {
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
  return new Blob([bytes as any], { type: 'image/gif' });
}

export async function captureCurrentFrame(
  video: HTMLVideoElement,
  isSquare = false
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  let w = video.videoWidth || 640;
  let h = video.videoHeight || 360;

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
