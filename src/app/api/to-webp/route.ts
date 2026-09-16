import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { addWhatsAppStickerMetadata } from '@/lib/whatsapp-exif';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const packName = (formData.get('pack') as string) || 'WhatsApp Creator';
    const authorName = (formData.get('author') as string) || 'SysGym';

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 1. Redimensionar y optimizar a WebP animado de exactamente 512x512
    const rawWebpBuffer = await sharp(inputBuffer, { animated: true })
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({
        effort: 6,
        quality: 75,
        loop: 0, // Bucle infinito obligatorio para stickers de WhatsApp
        force: true,
      })
      .toBuffer();

    // 2. Inyectar metadatos oficiales de WhatsApp Sticker (EXIF chunk)
    // Sin este chunk, WhatsApp interpreta el archivo como video/GIF común.
    // Con este chunk, WhatsApp lo clasifica como STICKER nativo.
    const stickerBuffer = addWhatsAppStickerMetadata(rawWebpBuffer, {
      packName,
      authorName,
    });

    return new Response(new Uint8Array(stickerBuffer), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': 'attachment; filename="sticker-whatsapp.webp"',
        'Content-Length': stickerBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error procesando sticker WebP con EXIF:', error);
    return NextResponse.json(
      { error: 'Error convirtiendo a WebP: ' + (error.message || 'desconocido') },
      { status: 500 }
    );
  }
}
