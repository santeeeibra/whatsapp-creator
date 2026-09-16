import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { addWhatsAppStickerMetadata } from '@/lib/whatsapp-exif';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let inputBuffer: Buffer | null = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      // Body directo binario
      const arrayBuffer = await request.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        inputBuffer = Buffer.from(arrayBuffer);
      }
    }

    if (!inputBuffer) {
      return NextResponse.json({ error: 'No se envió ninguna imagen' }, { status: 400 });
    }

    // Convertir a WebP 512x512 con fondo transparente
    const rawWebpBuffer = await sharp(inputBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Inyectar metadatos oficiales de WhatsApp Sticker
    const stickerBuffer = addWhatsAppStickerMetadata(rawWebpBuffer, {
      packName: 'iPhone Shortcuts',
      authorName: 'WhatsApp Creator',
    });

    return new Response(new Uint8Array(stickerBuffer), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': 'attachment; filename="sticker.webp"',
        'Content-Length': stickerBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error en image-to-sticker:', error);
    return NextResponse.json(
      { error: 'Error procesando imagen: ' + (error.message || 'desconocido') },
      { status: 500 }
    );
  }
}
