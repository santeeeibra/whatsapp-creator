export interface StickerMetadata {
  packName?: string;
  authorName?: string;
  emojis?: string[];
}

/**
 * Inyecta los metadatos EXIF oficiales que WhatsApp requiere para reconocer
 * un archivo WebP como STICKER en lugar de una imagen/GIF tradicional.
 */
export function addWhatsAppStickerMetadata(
  webpBuffer: Buffer,
  metadata: StickerMetadata = {}
): Buffer {
  const {
    packName = 'WhatsApp Creator',
    authorName = 'SysGym',
    emojis = ['🚀', '🎉'],
  } = metadata;

  const jsonPayload = JSON.stringify({
    'sticker-pack-id': 'com.whatsappcreator.stickerpack',
    'sticker-pack-name': packName,
    'sticker-pack-publisher': authorName,
    'emojis': emojis,
  });

  // Cabecera TIFF/EXIF específica que espera WhatsApp
  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x16, 0x00, 0x00, 0x00,
  ]);

  const jsonBuffer = Buffer.from(jsonPayload, 'utf-8');
  const exifPayload = Buffer.concat([exifHeader, jsonBuffer]);
  exifPayload.writeUInt32LE(jsonBuffer.length, 14);

  // Chunk WebP EXIF: 'EXIF' (4 bytes) + tamaño (4 bytes uint32 LE) + payload + padding
  const exifChunkHeader = Buffer.alloc(8);
  exifChunkHeader.write('EXIF', 0, 4, 'ascii');
  exifChunkHeader.writeUInt32LE(exifPayload.length, 4);

  const pad = exifPayload.length % 2 === 1 ? Buffer.alloc(1) : Buffer.alloc(0);
  const fullExifChunk = Buffer.concat([exifChunkHeader, exifPayload, pad]);

  // Si ya existía un chunk EXIF en el WebP original, lo removemos antes de agregar el nuevo
  let cleanBuffer = webpBuffer;
  const existingExifIndex = cleanBuffer.indexOf(Buffer.from('EXIF'));
  if (existingExifIndex !== -1) {
    const chunkSize = cleanBuffer.readUInt32LE(existingExifIndex + 4);
    const chunkTotalLength = 8 + chunkSize + (chunkSize % 2);
    cleanBuffer = Buffer.concat([
      cleanBuffer.subarray(0, existingExifIndex),
      cleanBuffer.subarray(existingExifIndex + chunkTotalLength),
    ]);
  }

  // Concatenar el nuevo chunk EXIF al final de los chunks WebP
  const result = Buffer.concat([cleanBuffer, fullExifChunk]);

  // Actualizar el tamaño global en el encabezado RIFF (bytes 4..7)
  const totalRiffSize = result.length - 8;
  result.writeUInt32LE(totalRiffSize, 4);

  // Si tiene cabecera extendida VP8X (a partir del byte 12), activar el bit 3 (0x08) de flags EXIF
  if (result.toString('ascii', 12, 16) === 'VP8X') {
    const currentFlags = result.readUInt8(20);
    result.writeUInt8(currentFlags | 0x08, 20);
  }

  return result;
}
