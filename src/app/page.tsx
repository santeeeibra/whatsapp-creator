'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Share2,
  Download,
  Copy,
  Sparkles,
  Scissors,
  Play,
  Pause,
  Upload,
  Link2,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { convertVideoToGif, captureCurrentFrame } from '@/lib/converter';

type Platform = 'twitter' | 'tiktok' | 'direct' | 'local' | null;

export default function Home() {
  // Estados de entrada
  const [url, setUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados del video
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [platform, setPlatform] = useState<Platform>(null);
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Opciones de conversión
  const [format, setFormat] = useState<'sticker' | 'gif' | 'photo'>('sticker');
  const [fps, setFps] = useState<number>(12);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Resultado
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clip de prueba precargado
  const sampleVideoUrl =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

  // Manejo de carga de video desde URL
  const handleExtractUrl = async (customUrl?: string) => {
    const targetUrl = customUrl || url;
    if (!targetUrl.trim()) return;

    setIsLoadingUrl(true);
    setErrorMessage(null);
    setResultBlob(null);
    setResultUrl(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo procesar el enlace.');
      }

      // Si es un video remoto, pasarlo por el proxy para evitar problemas de CORS en Canvas
      const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(data.videoUrl)}`;
      setVideoSrc(proxyUrl);
      setVideoTitle(data.title || 'Video seleccionado');
      setPlatform(data.platform || 'direct');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al obtener el video');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Manejo de archivo local (Drag & drop o selector)
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrorMessage('Por favor seleccioná un archivo de video válido (.mp4, .webm, .mov)');
      return;
    }

    setErrorMessage(null);
    setResultBlob(null);
    setResultUrl(null);

    const objectUrl = URL.createObjectURL(file);
    setVideoSrc(objectUrl);
    setVideoTitle(file.name);
    setPlatform('local');
  };

  // Cuando el video carga su metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setStartTime(0);
      // Por defecto 3 segundos o la duración total si es menor
      const initialEnd = Math.min(3, Math.max(1, dur));
      setEndTime(initialEnd);
    }
  };

  // Actualización de tiempo de reproducción
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      // Si se pasa del tiempo final seleccionado, rebobinar al inicio del clip
      if (cur >= endTime) {
        videoRef.current.currentTime = startTime;
      }
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Generar Sticker o GIF
  const handleConvert = async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);
    setProgress(0);
    setErrorMessage(null);

    try {
      if (format === 'photo') {
        const blob = await captureCurrentFrame(videoRef.current, true);
        const objUrl = URL.createObjectURL(blob);
        setResultBlob(blob);
        setResultUrl(objUrl);
      } else {
        const blob = await convertVideoToGif(videoRef.current, {
          startTime,
          endTime,
          fps,
          width: format === 'sticker' ? 320 : 400,
          isSquare: format === 'sticker',
          onProgress: (p) => setProgress(p),
        });

        const objUrl = URL.createObjectURL(blob);
        setResultBlob(blob);
        setResultUrl(objUrl);
      }

      // Celebración con confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#25D366', '#128C7E', '#34B7F1', '#ffffff'],
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Ocurrió un error durante la conversión');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Compartir a WhatsApp (1-Click)
  const handleShareWhatsApp = async () => {
    if (!resultBlob) return;

    const fileName =
      format === 'photo' ? 'captura.png' : format === 'sticker' ? 'sticker.gif' : 'animacion.gif';
    const mimeType = format === 'photo' ? 'image/png' : 'image/gif';
    const file = new File([resultBlob], fileName, { type: mimeType });

    // 1. Si el navegador soporta compartir archivos nativos (Mobile: iOS / Android)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Sticker para WhatsApp',
          text: '¡Mirá este sticker creado con WhatsApp Creator!',
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Error en navigator.share:', err);
        }
      }
    }

    // 2. Si estamos en PC / Desktop, copiar al portapapeles para pegar directo en WhatsApp Web
    await handleCopyImage();
  };

  // Copiar imagen al portapapeles
  const handleCopyImage = async () => {
    if (!resultBlob) return;

    try {
      // Para portapapeles se requiere PNG
      let clipboardBlob = resultBlob;
      if (resultBlob.type !== 'image/png') {
        // Convertir frame del resultado a PNG para el clipboard
        const img = new Image();
        img.src = resultUrl!;
        await new Promise((res) => (img.onload = res));

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 320;
        canvas.height = img.naturalHeight || 320;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        clipboardBlob = await new Promise<Blob>((res) =>
          canvas.toBlob((b) => res(b!), 'image/png')
        );
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': clipboardBlob,
        }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error(err);
      // Fallback: descargar automáticamente
      handleDownload();
    }
  };

  // Descarga del archivo
  const handleDownload = () => {
    if (!resultUrl) return;
    const ext = format === 'photo' ? 'png' : 'gif';
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `whatsapp-sticker-${Date.now()}.${ext}`;
    a.click();
  };

  const clipDuration = Math.max(0, endTime - startTime).toFixed(1);
  const isOptimalForWhatsApp = parseFloat(clipDuration) <= 5.0;

  return (
    <main className="min-h-screen bg-[#0b0f17] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-[#25D366] selection:text-black">
      {/* Glow de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#25D366]/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Header */}
      <header className="w-full max-w-3xl flex flex-col items-center text-center my-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Convertidor Ultrarrápido a WhatsApp
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          De Video a Sticker en 1 Click
        </h1>
        <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-xl">
          Pegá un enlace de <strong className="text-zinc-200">X (Twitter)</strong> o{' '}
          <strong className="text-zinc-200">TikTok</strong>, recortá los mejores segundos y
          compartilo directo a WhatsApp como Sticker o GIF.
        </p>
      </header>

      {/* Contenedor principal */}
      <div className="w-full max-w-3xl flex flex-col gap-6 relative z-10">
        {/* Barra de entrada de enlace */}
        <section className="bg-zinc-900/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl shadow-black/40">
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Pega el enlace del video:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="https://x.com/... o https://tiktok.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExtractUrl()}
                className="w-full bg-zinc-950/70 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#25D366] transition-colors"
              />
              {url && (
                <button
                  onClick={() => setUrl('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Limpiar
                </button>
              )}
            </div>

            <button
              onClick={() => handleExtractUrl()}
              disabled={isLoadingUrl || !url.trim()}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-semibold text-sm px-6 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 active:scale-95"
            >
              {isLoadingUrl ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Obtener Video
                </>
              )}
            </button>
          </div>

          {/* Opciones secundarias: Subir archivo o Probar Demo */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="hover:text-zinc-200 flex items-center gap-1.5 transition-colors underline decoration-dotted"
              >
                <Upload className="w-3.5 h-3.5" />
                O subir video desde tu equipo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
            </div>

            <button
              onClick={() => handleExtractUrl(sampleVideoUrl)}
              className="text-[#25D366] hover:underline flex items-center gap-1"
            >
              Probar con video de ejemplo &rarr;
            </button>
          </div>

          {/* Mensaje de Error */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </section>

        {/* Zona de Trabajo: Reproductor y Recorte */}
        {videoSrc && (
          <section className="bg-zinc-900/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-zinc-800 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#25D366]" />
                <h2 className="text-sm font-semibold text-zinc-200">Editor de Recorte</h2>
              </div>
              <span className="text-xs text-zinc-500 truncate max-w-[200px]">{videoTitle}</span>
            </div>

            {/* Video Player */}
            <div className="relative w-full aspect-video sm:max-h-[380px] bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                crossOrigin="anonymous"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                className="max-h-full max-w-full object-contain"
              />

              {/* Botón flotante Play/Pause */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-12 h-12 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-transform active:scale-90"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              {/* Tiempo actual */}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-[11px] font-mono text-zinc-300">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </div>
            </div>

            {/* Controles de Rango de Recorte */}
            <div className="space-y-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Seleccionar fragmento del video:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded ${
                    isOptimalForWhatsApp
                      ? 'bg-[#25D366]/20 text-[#25D366]'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  Duración: {clipDuration}s {isOptimalForWhatsApp ? '✓ Ideal WhatsApp' : '⚠️ > 5s'}
                </span>
              </div>

              {/* Sliders de inicio y fin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Inicio:</span>
                    <span className="font-mono text-zinc-200">{startTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 10}
                    step={0.1}
                    value={startTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setStartTime(val);
                      if (val >= endTime) setEndTime(Math.min(val + 1, duration));
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full accent-[#25D366] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Fin:</span>
                    <span className="font-mono text-zinc-200">{endTime.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 10}
                    step={0.1}
                    value={endTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEndTime(val);
                      if (val <= startTime) setStartTime(Math.max(val - 1, 0));
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full accent-[#25D366] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Configuración de salida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Formato */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Formato de salida:
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setFormat('sticker')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      format === 'sticker'
                        ? 'bg-[#25D366] text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Sticker 1:1
                  </button>
                  <button
                    onClick={() => setFormat('gif')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      format === 'gif'
                        ? 'bg-[#25D366] text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    GIF Original
                  </button>
                  <button
                    onClick={() => setFormat('photo')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      format === 'photo'
                        ? 'bg-[#25D366] text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Foto Fija
                  </button>
                </div>
              </div>

              {/* Fluidez / FPS */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Fluidez y tamaño:
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setFps(10)}
                    disabled={format === 'photo'}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${
                      fps === 10 && format !== 'photo'
                        ? 'bg-zinc-800 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    10 FPS (Ligero)
                  </button>
                  <button
                    onClick={() => setFps(15)}
                    disabled={format === 'photo'}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${
                      fps === 15 && format !== 'photo'
                        ? 'bg-zinc-800 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    15 FPS (Fluido)
                  </button>
                </div>
              </div>
            </div>

            {/* Botón de Generación */}
            <button
              onClick={handleConvert}
              disabled={isProcessing}
              className="w-full py-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:opacity-90 text-black font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 active:scale-[0.99]"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Convirtiendo en tu navegador ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>
                    Generar {format === 'photo' ? 'Captura' : format === 'sticker' ? 'Sticker' : 'GIF'}
                  </span>
                </>
              )}
            </button>

            {/* Barra de progreso */}
            {isProcessing && (
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#25D366] h-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </section>
        )}

        {/* Sección de Resultado y Acciones para WhatsApp */}
        {resultUrl && (
          <section className="bg-zinc-900/90 backdrop-blur-md p-6 rounded-2xl border-2 border-[#25D366]/50 shadow-2xl flex flex-col items-center gap-5">
            <div className="flex items-center gap-2 text-[#25D366] font-semibold text-sm">
              <Check className="w-5 h-5" />
              ¡Listo para enviar a WhatsApp!
            </div>

            {/* Visualizador del resultado */}
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-inner flex flex-col items-center">
              {/* Contenedor estilo sticker */}
              <div className="relative w-64 h-64 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-zinc-900 to-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultUrl}
                  alt="Resultado Sticker"
                  className="max-w-full max-h-full object-contain drop-shadow-2xl"
                />
              </div>

              {resultBlob && (
                <div className="mt-3 text-xs text-zinc-400">
                  Peso: {(resultBlob.size / 1024).toFixed(1)} KB &bull;{' '}
                  <span className="text-[#25D366]">Listo para compartir</span>
                </div>
              )}
            </div>

            {/* Botones de acción rápida */}
            <div className="w-full flex flex-col sm:flex-row gap-3">
              {/* Botón Principal: Compartir WhatsApp 1-Click */}
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/25 active:scale-95"
              >
                <Share2 className="w-5 h-5" />
                <span>{shared ? '¡Compartido!' : 'Enviar a WhatsApp (1 Click)'}</span>
              </button>

              {/* Botón Copiar al portapapeles */}
              <button
                onClick={handleCopyImage}
                className="py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-[#25D366]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Imagen'}</span>
              </button>

              {/* Botón Descargar */}
              <button
                onClick={handleDownload}
                className="py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Descargar</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400 text-center">
              💡 <strong>En el celular</strong>: Se abre WhatsApp directamente para elegir el contacto.
              <br />
              💡 <strong>En PC / Mac</strong>: Tocá &ldquo;Copiar Imagen&rdquo; y pegala con{' '}
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-200">Ctrl + V</kbd> en
              cualquier chat de WhatsApp Web.
            </p>
          </section>
        )}

        {/* Guía informativa de compatibilidad */}
        <footer className="mt-4 p-5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs text-zinc-400 flex flex-col gap-3">
          <div className="font-semibold text-zinc-300 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#25D366]" />
            ¿Por qué funciona en 1 Click y sin costo de servidor?
          </div>
          <p>
            El procesamiento y renderizado de frames se ejecuta al 100% en tu propio navegador
            usando aceleración por <strong>HTML5 Canvas</strong> y algoritmos de paleta cuántica.
            Esto permite alojarlo gratis en Vercel sin límites de CPU ni tiempos de espera.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-[11px]">
            <div>
              <strong className="text-zinc-300">X (Twitter):</strong> Extracción instantánea sin
              claves ni logueo.
            </div>
            <div>
              <strong className="text-zinc-300">TikTok:</strong> Extracción en alta definición sin
              marca de agua.
            </div>
            <div>
              <strong className="text-zinc-300">Videos Locales:</strong> Arrastrá cualquier video
              directo desde tu galería.
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
