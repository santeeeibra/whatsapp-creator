'use client';

import React from 'react';
import { AudioLines, Info, Apple } from 'lucide-react';

interface SoundStickerGuideProps {
  isIOS: boolean;
}

/**
 * Instrucciones para convertir el video con audio en un sticker con sonido
 * dentro de WhatsApp (función en despliegue gradual en Android, nov. 2026).
 * WhatsApp no permite importar stickers con sonido desde apps externas:
 * el sticker se termina en su propio editor a partir del video guardado.
 */
export default function SoundStickerGuide({ isIOS }: SoundStickerGuideProps) {
  if (isIOS) {
    return (
      <div className="w-full bg-[#1c2a38] border border-sky-500/40 rounded-2xl p-4 text-xs text-sky-100 flex flex-col gap-2">
        <div className="flex items-center gap-2 font-bold text-sky-300 text-sm">
          <Apple className="w-4 h-4 text-sky-400" />
          Stickers con sonido en iPhone
        </div>
        <p className="text-zinc-300 leading-relaxed">
          Por ahora WhatsApp habilita los stickers con sonido solo en algunas cuentas de Android.
          En iPhone podés guardar el video o tocar <strong className="text-white">Compartir</strong>{' '}
          para mandarlo como video con audio.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-950/60 border border-[#25D366]/30 rounded-2xl p-4 text-xs text-zinc-300 flex flex-col gap-3">
      <div className="flex items-center gap-2 font-bold text-[#25D366] text-sm">
        <AudioLines className="w-4 h-4" />
        Convertilo en sticker con sonido
      </div>

      <ol className="list-decimal pl-4 space-y-1.5">
        <li>
          Tocá <strong className="text-white">Guardar video para sticker</strong> (queda en tu
          galería / descargas).
        </li>
        <li>
          En WhatsApp abrí un chat, entrá a <strong className="text-white">Stickers</strong> y tocá{' '}
          <strong className="text-[#25D366]">&ldquo;Crear sticker&rdquo;</strong>.
        </li>
        <li>Elegí el video que acabás de guardar.</li>
        <li>
          Tocá el ícono de <strong className="text-white">ondas de sonido</strong> arriba y dejá el{' '}
          <strong className="text-white">audio original</strong>.
        </li>
        <li>Guardalo y envialo. Para tenerlo siempre, marcalo con ⭐ en el chat.</li>
      </ol>

      <div className="flex items-start gap-2 text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>
          WhatsApp está habilitando esta función de a poco en Android. Si no ves el ícono de ondas,
          tu cuenta todavía no la tiene: tocá <strong>Compartir</strong> para mandarlo como video
          con audio. WhatsApp no permite pegar ni importar stickers con sonido desde otras apps:
          se terminan en su propio editor.
        </span>
      </div>
    </div>
  );
}
