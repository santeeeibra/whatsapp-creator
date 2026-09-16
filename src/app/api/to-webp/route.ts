import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Convertir GIF animado a WebP animado de exactamente 512x512 para WhatsApp
    const webpBuffer = await sharp(inputBuffer, { animated: true })
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

    return new Response(webpBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': 'attachment; filename="sticker-whatsapp.webp"',
        'Content-Length': webpBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error convirtiendo a WebP:', error);
    return NextResponse.json(
      { error: 'Error convirtiendo a WebP: ' + (error.message || 'desconocido') },
      { status: 500 }
    );
  }
}
