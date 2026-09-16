import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Debes ingresar una URL válida' }, { status: 400 });
    }

    const trimmedUrl = url.trim();

    // 1. Detección de video directo (.mp4, .webm, .mov)
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(trimmedUrl)) {
      return NextResponse.json({
        success: true,
        videoUrl: trimmedUrl,
        title: 'Video directo',
        platform: 'direct',
      });
    }

    // 2. Twitter / X (x.com, twitter.com)
    if (trimmedUrl.includes('twitter.com') || trimmedUrl.includes('x.com')) {
      const match = trimmedUrl.match(/status\/(\d+)/);
      if (!match) {
        return NextResponse.json(
          { error: 'No se pudo encontrar el ID del tweet. Asegurate de que sea un link a un post o tweet con video.' },
          { status: 400 }
        );
      }

      const tweetId = match[1];

      // Consultar fxtwitter API
      const fxRes = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhatsAppCreator/1.0)' },
        next: { revalidate: 3600 },
      });

      if (fxRes.ok) {
        const data = await fxRes.json();
        const tweet = data.tweet;

        if (tweet?.media?.videos && tweet.media.videos.length > 0) {
          const video = tweet.media.videos[0];
          return NextResponse.json({
            success: true,
            videoUrl: video.url,
            thumbnail: video.thumbnail_url || tweet.media.photos?.[0]?.url,
            title: tweet.text?.slice(0, 80) || 'Video de X / Twitter',
            platform: 'twitter',
            duration: video.duration,
          });
        }

        // Si tiene video en media.all
        const allVideos = tweet?.media?.all?.filter((m: { type: string; url: string }) => m.type === 'video');
        if (allVideos && allVideos.length > 0) {
          return NextResponse.json({
            success: true,
            videoUrl: allVideos[0].url,
            thumbnail: tweet.media.photos?.[0]?.url,
            title: tweet.text?.slice(0, 80) || 'Video de X / Twitter',
            platform: 'twitter',
          });
        }
      }

      return NextResponse.json(
        { error: 'El tweet no parece contener un video público descargable.' },
        { status: 404 }
      );
    }

    // 3. TikTok (tiktok.com)
    if (trimmedUrl.includes('tiktok.com')) {
      const tikRes = await fetch(
        `https://www.tikwm.com/api/?url=${encodeURIComponent(trimmedUrl)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );

      if (tikRes.ok) {
        const tikData = await tikRes.json();
        if (tikData.code === 0 && tikData.data?.play) {
          return NextResponse.json({
            success: true,
            videoUrl: tikData.data.play,
            thumbnail: tikData.data.cover,
            title: tikData.data.title || 'Video de TikTok',
            platform: 'tiktok',
            duration: tikData.data.duration,
          });
        }
      }

      return NextResponse.json(
        { error: 'No se pudo extraer el video de TikTok. Verificá que sea público.' },
        { status: 404 }
      );
    }

    // 4. Instagram (instagram.com)
    if (trimmedUrl.includes('instagram.com')) {
      // Instagram requiere proxies dedicados para extraer dinámicamente.
      // Proveer mensaje claro y opción de subida directa.
      return NextResponse.json(
        {
          error:
            'Instagram bloquea descargas automáticas sin sesión activa. Podés descargar el Reel o guardarlo en tu celular/PC y arrastrar el archivo de video directamente a la aplicación para convertirlo en Sticker en 1 segundo.',
          isInstagramNotice: true,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error:
          'Plataforma no reconocida. Soportamos enlaces de X (Twitter), TikTok o enlaces directos a videos (.mp4). También podés subir cualquier video desde tu dispositivo.',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error extract route:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el enlace. Intentá nuevamente.' },
      { status: 500 }
    );
  }
}
