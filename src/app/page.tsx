'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Smartphone,
  Info,
  Apple,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { convertVideoToGif, captureCurrentFrame } from '@/lib/converter';

type Platform = 'twitter' | 'tiktok' | 'direct' | 'local' | null;

function CreatorApp() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isApple =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isApple);
    }
  }, []);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [platform, setPlatform] = useState<Platform>(null);
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [format, setFormat] = useState<'sticker' | 'gif' | 'photo'>('sticker');
  const [fps, setFps] = useState<number>(12);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState<string>('Procesando...');

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultMimeType, setResultMimeType] = useState<string>('image/webp');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sampleVideoUrl =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

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

  useEffect(() => {
    const paramUrl = searchParams.get('url');
    if (paramUrl) {
      setUrl(paramUrl);
      handleExtractUrl(paramUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setStartTime(0);
      const initialEnd = Math.min(3, Math.max(1, dur));
      setEndTime(initialEnd);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      if (cur >= endTime) {
        videoRef.current.currentTime = startTime;
      }
    }
  };

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

  const handleConvert = async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);
    setProgress(0);
    setStatusText('Capturando fotogramas...');
    setErrorMessage(null);

    try {
      if (format === 'photo') {
        const blob = await captureCurrentFrame(videoRef.current, true);
        const objUrl = URL.createObjectURL(blob);
        setResultBlob(blob);
        setResultUrl(objUrl);
        setResultMimeType('image/png');
      } else {
        const gifBlob = await convertVideoToGif(videoRef.current, {
          startTime,
          endTime,
          fps,
          width: format === 'sticker' ? 320 : 400,
          isSquare: format === 'sticker',
          onProgress: (p) => {
            setProgress(Math.min(90, Math.round(p * 0.9)));
            setStatusText(`Procesando video (${Math.round(p)}%)...`);
          },
        });

        if (format === 'sticker') {
          setProgress(92);
          setStatusText('Aplicando formato oficial de WhatsApp Sticker...');

          try {
            const formData = new FormData();
            formData.append('file', gifBlob, 'temp.gif');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const resWebp = await fetch('/api/to-webp', {
              method: 'POST',
              body: formData,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (resWebp.ok) {
              const webpBlob = await resWebp.blob();
              const objUrl = URL.createObjectURL(webpBlob);
              setResultBlob(webpBlob);
              setResultUrl(objUrl);
              setResultMimeType('image/webp');
            } else {
              const objUrl = URL.createObjectURL(gifBlob);
              setResultBlob(gifBlob);
              setResultUrl(objUrl);
              setResultMimeType('image/gif');
            }
          } catch (webpErr) {
            console.warn('Fallback a GIF seguro:', webpErr);
            const objUrl = URL.createObjectURL(gifBlob);
            setResultBlob(gifBlob);
            setResultUrl(objUrl);
            setResultMimeType('image/gif');
          }
        } else {
          const objUrl = URL.createObjectURL(gifBlob);
          setResultBlob(gifBlob);
          setResultUrl(objUrl);
          setResultMimeType('image/gif');
        }
      }

      setProgress(100);
      setStatusText('¡Listo!');

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

  const handleShareWhatsApp = async () => {
    if (!resultBlob) return;

    const ext = resultMimeType === 'image/webp' ? 'webp' : resultMimeType === 'image/png' ? 'png' : 'gif';
    const file = new File([resultBlob], `sticker-whatsapp.${ext}`, { type: resultMimeType });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Sticker animado para WhatsApp',
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

    handleDownload();
  };

  const handleCopyImage = async () => {
    if (!resultBlob) return;

    try {
      let clipboardBlob = resultBlob;
      if (resultBlob.type !== 'image/png') {
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
      setTimeout(() => setCopied(false), 4000);
    } catch (err) {
      console.error(err);
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const ext = resultMimeType === 'image/webp' ? 'webp' : resultMimeType === 'image/png' ? 'png' : 'gif';
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `sticker-whatsapp-${Date.now()}.${ext}`;
    a.click();
  };

  const clipDuration = Math.max(0, endTime - startTime).toFixed(1);
  const isOptimalForWhatsApp = parseFloat(clipDuration) <= 5.0;

  return (
    <main className="min-h-screen bg-[#0b0f17] text-white flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-[#25D366] selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#25D366]/10 blur-[130px] pointer-events-none rounded-full" />

      <header className="w-full max-w-3xl flex flex-col items-center text-center my-6 relative z-10">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Stickers Animados WebP (512x512) para WhatsApp
          </div>

          <button
            onClick={() => setShowShortcutModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-semibold hover:bg-sky-500/25 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            Atajo iPhone (iOS)
          </button>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          De Video a Sticker en 1 Click
        </h1>
        <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-xl">
          Convertí videos de <strong className="text-zinc-200">X (Twitter)</strong> o{' '}
          <strong className="text-zinc-200">TikTok</strong> en stickers animados para
          WhatsApp en segundos.
        </p>
      </header>

      <div className="w-full max-w-3xl flex flex-col gap-6 relative z-10">
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

          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </section>

        {videoSrc && (
          <section className="bg-zinc-900/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-zinc-800 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#25D366]" />
                <h2 className="text-sm font-semibold text-zinc-200">Editor de Recorte</h2>
              </div>
              <span className="text-xs text-zinc-500 truncate max-w-[200px]">{videoTitle}</span>
            </div>

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

              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-12 h-12 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-transform active:scale-90"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-[11px] font-mono text-zinc-300">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </div>
            </div>

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
                  Duración: {clipDuration}s {isOptimalForWhatsApp ? '✓ Ideal WhatsApp (≤ 5s)' : '⚠️ > 5s'}
                </span>
              </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    Sticker 1:1 (.webp)
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
                    10 FPS (Ligero &lt;500KB)
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

            <button
              onClick={handleConvert}
              disabled={isProcessing}
              className="w-full py-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:opacity-90 text-black font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 active:scale-[0.99]"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{statusText}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>
                    Generar {format === 'photo' ? 'Captura' : format === 'sticker' ? 'Sticker Animado (.webp)' : 'GIF'}
                  </span>
                </>
              )}
            </button>

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

        {resultUrl && (
          <section className="bg-zinc-900/90 backdrop-blur-md p-6 rounded-2xl border-2 border-[#25D366]/50 shadow-2xl flex flex-col items-center gap-5">
            <div className="flex items-center gap-2 text-[#25D366] font-semibold text-sm">
              <Check className="w-5 h-5" />
              ¡Sticker generado exitosamente!
            </div>

            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-inner flex flex-col items-center">
              <div className="relative w-64 h-64 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-zinc-900 to-black cursor-grab active:cursor-grabbing">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultUrl}
                  alt="Sticker animado"
                  draggable
                  className="max-w-full max-h-full object-contain drop-shadow-2xl"
                />
              </div>

              {resultBlob && (
                <div className="mt-3 text-xs text-zinc-400 flex items-center gap-2">
                  <span>Peso: <strong>{(resultBlob.size / 1024).toFixed(1)} KB</strong></span>
                  &bull;
                  <span className="text-[#25D366]">
                    {resultMimeType === 'image/webp' ? 'Formato WebP 512x512' : 'Formato GIF'}
                  </span>
                </div>
              )}
            </div>

            {/* AVISO ESPECIAL PARA IPHONE / IOS */}
            {isIOS ? (
              <div className="w-full bg-[#1c2a38] border border-sky-500/40 rounded-2xl p-4 text-xs text-sky-100 flex flex-col gap-3">
                <div className="flex items-center gap-2 font-bold text-sky-300 text-sm">
                  <Apple className="w-4 h-4 text-sky-400" />
                  ¿Por qué en iPhone el botón &ldquo;Compartir&rdquo; lo manda como GIF?
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  Apple bloquea que apps externas creen stickers directo desde la hoja de compartir; WhatsApp en iOS solo admite crear stickers desde adentro de su propia app.
                </p>
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-sky-500/20 space-y-2">
                  <p className="font-semibold text-sky-200">
                    🎯 El truco de 2 segundos para iPhone:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-zinc-300">
                    <li>
                      Tocá el botón verde <strong className="text-white">Guardar en Fotos / Descargar</strong>.
                    </li>
                    <li>
                      Abrí WhatsApp en tu iPhone y entrá a cualquier chat.
                    </li>
                    <li>
                      Tocá el ícono de stickers en el teclado y presioná el botón <strong className="text-[#25D366]">&ldquo;Crear&rdquo; (+)</strong>.
                    </li>
                    <li>
                      Elegí el sticker que acabás de guardar: ¡WhatsApp lo envía como sticker real y le podés poner la estrella ⭐!
                    </li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="w-full bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-300">
                    Cómo enviarlo en WhatsApp sin que quede como GIF:
                  </p>
                  <p className="text-zinc-300 leading-relaxed">
                    📱 <strong>En Android</strong>: Tocá <strong className="text-[#25D366]">Compartir en WhatsApp</strong> y se envía como sticker.
                  </p>
                  <p className="text-zinc-300 leading-relaxed">
                    💻 <strong>En WhatsApp Web</strong>: Descargá el archivo y arrastralo adentro del chat (o tocalo con el botón de stickers &ldquo;+&rdquo;).
                  </p>
                </div>
              </div>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3.5 px-5 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-[#25D366]/25"
              >
                <Download className="w-5 h-5 text-black" />
                <span>Guardar Sticker ({resultMimeType === 'image/webp' ? '.webp' : '.gif'})</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-zinc-700"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir</span>
              </button>

              <button
                onClick={handleCopyImage}
                title="Copia la imagen para pegar en WhatsApp Web"
                className="py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#25D366]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </section>
        )}

        {/* Modal / Sección de Configuración del Atajo de iPhone */}
        {showShortcutModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-base">
                  <Zap className="w-5 h-5" />
                  Atajo de iPhone (Siri Shortcuts)
                </div>
                <button
                  onClick={() => setShowShortcutModal(false)}
                  className="text-zinc-400 hover:text-white text-sm cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Podés crear un atajo en la app <strong>Atajos (Shortcuts)</strong> de tu iPhone para que,
                al tocar <strong>Compartir</strong> en cualquier tweet o video de TikTok, se abra la web
                con el video ya cargado automáticamente.
              </p>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 text-xs">
                <p className="font-semibold text-sky-300">
                  Pasos para crearlo en 30 segundos:
                </p>
                <ol className="list-decimal pl-4 space-y-2 text-zinc-300">
                  <li>
                    Abrí la app <strong>Atajos</strong> en tu iPhone y tocá <strong>&ldquo;+&rdquo;</strong> (Nuevo Atajo).
                  </li>
                  <li>
                    Tocá la <strong>(i)</strong> de abajo y activá: <strong>&ldquo;Mostrar en la hoja para compartir&rdquo;</strong>.
                  </li>
                  <li>
                    Agregá la acción: <strong>&ldquo;Abrir URLs&rdquo;</strong>.
                  </li>
                  <li>
                    Pegá este formato en la URL:
                    <div className="mt-1 p-2 bg-zinc-900 font-mono text-[11px] text-[#25D366] rounded select-all break-all">
                      https://whatsapp-creator-santeeeibra.vercel.app/?url=[Entrada del atajo]
                    </div>
                  </li>
                  <li>
                    ¡Listo! Nombralo <strong>&ldquo;Crear Sticker WhatsApp&rdquo;</strong>.
                  </li>
                </ol>
              </div>

              <button
                onClick={() => setShowShortcutModal(false)}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        <footer className="mt-4 p-5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs text-zinc-400 flex flex-col gap-3">
          <div className="font-semibold text-zinc-300 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#25D366]" />
            Cómo guardar cualquier sticker en tus favoritos ⭐
          </div>
          <p>
            Una vez enviado el sticker a cualquier conversación (o a tu chat de &ldquo;Mensajes contigo mismo&rdquo;):
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-zinc-300">
            <li>Hacé clic / tocá sobre el sticker animado en el chat.</li>
            <li>Seleccioná la opción <strong>&ldquo;Añadir a favoritos&rdquo; (⭐)</strong>.</li>
            <li>¡Listo! Te queda guardado para siempre en tu bandeja de stickers de WhatsApp.</li>
          </ol>
        </footer>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f17] text-white flex items-center justify-center">Cargando...</div>}>
      <CreatorApp />
    </Suspense>
  );
}
