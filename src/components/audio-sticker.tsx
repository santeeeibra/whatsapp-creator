'use client';

import React, { useRef, useState } from 'react';
import { Music, Film, Upload, RefreshCw, Trash2, AlertCircle, Info, Download } from 'lucide-react';
import {
  extractAudioFromVideo,
  getAudioDuration,
  isAcceptedAudioFile,
  MAX_UPLOAD_AUDIO_SECONDS,
  MAX_VIDEO_AUDIO_SECONDS,
  type StickerAudio,
} from '@/lib/audio';

interface AudioStickerProps {
  videoSrc: string;
  startTime: number;
  endTime: number;
  value: StickerAudio | null;
  onChange: (audio: StickerAudio | null) => void;
}

export default function AudioSticker({
  videoSrc,
  startTime,
  endTime,
  value,
  onChange,
}: AudioStickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const handleUseVideoAudio = async () => {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const { blob, duration, truncated } = await extractAudioFromVideo(
        videoSrc,
        startTime,
        endTime
      );
      const start = startTime.toFixed(1);
      const end = (startTime + duration).toFixed(1);
      onChange({
        blob,
        url: URL.createObjectURL(blob),
        source: 'video',
        label: `Audio del video (${start}s – ${end}s)`,
        duration,
      });
      if (truncated) {
        setNotice(
          `El fragmento dura más de ${MAX_VIDEO_AUDIO_SECONDS}s: se usaron solo los primeros ${MAX_VIDEO_AUDIO_SECONDS}s.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo extraer el audio del video.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioFile = async (file: File) => {
    setError(null);
    setNotice(null);

    if (!isAcceptedAudioFile(file)) {
      setError('Formato no válido. Subí un archivo .mp3, .wav o .m4a.');
      return;
    }

    setIsLoading(true);
    try {
      const duration = await getAudioDuration(file);
      if (duration > MAX_UPLOAD_AUDIO_SECONDS) {
        setError(
          `El audio dura ${duration.toFixed(1)}s. El máximo permitido es ${MAX_UPLOAD_AUDIO_SECONDS}s.`
        );
        return;
      }
      onChange({
        blob: file,
        url: URL.createObjectURL(file),
        source: 'file',
        label: file.name,
        duration,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo de audio.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAudio = () => {
    if (!value) return;
    const name =
      value.source === 'file' && value.blob instanceof File
        ? value.blob.name
        : `audio-sticker-${Date.now()}.wav`;
    const a = document.createElement('a');
    a.href = value.url;
    a.download = name;
    a.click();
  };

  const handleRemove = () => {
    setError(null);
    setNotice(null);
    onChange(null);
  };

  return (
    <div className="space-y-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-zinc-300 font-semibold">
          <Music className="w-4 h-4 text-[#25D366]" />
          Audio del sticker
        </div>
        <span className="text-zinc-500">Opcional</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleUseVideoAudio}
          disabled={isLoading}
          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 border disabled:opacity-50 ${
            value?.source === 'video'
              ? 'bg-[#25D366] text-black border-[#25D366] shadow'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          Usar audio del video (máx. {MAX_VIDEO_AUDIO_SECONDS}s)
        </button>

        <button
          type="button"
          onClick={() => audioInputRef.current?.click()}
          disabled={isLoading}
          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 border disabled:opacity-50 ${
            value?.source === 'file'
              ? 'bg-[#25D366] text-black border-[#25D366] shadow'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Subir audio (.mp3, .wav, .m4a · máx. {MAX_UPLOAD_AUDIO_SECONDS}s)
        </button>
        <input
          ref={audioInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAudioFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Preparando audio...
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200/90 text-xs flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {value && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg bg-zinc-900/80 border border-[#25D366]/30">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-200 truncate">{value.label}</div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {value.duration.toFixed(1)}s
            </div>
          </div>
          <audio src={value.url} controls preload="metadata" className="h-8 w-full sm:w-56" />
          <button
            type="button"
            onClick={handleDownloadAudio}
            title="Guardá el audio para usarlo en el editor de stickers de WhatsApp"
            className="py-1.5 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar audio
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="py-1.5 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-300 hover:bg-red-950/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Quitar
          </button>
        </div>
      )}
    </div>
  );
}
