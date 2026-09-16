import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const videoUrl = request.nextUrl.searchParams.get('url');

  if (!videoUrl) {
    return new Response('URL parameter is required', { status: 400 });
  }

  try {
    const range = request.headers.get('range');
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (range) {
      headers['Range'] = range;
    }

    const response = await fetch(videoUrl, {
      headers,
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Content-Type', response.headers.get('content-type') || 'video/mp4');
    
    if (response.headers.has('content-length')) {
      responseHeaders.set('Content-Length', response.headers.get('content-length')!);
    }
    if (response.headers.has('content-range')) {
      responseHeaders.set('Content-Range', response.headers.get('content-range')!);
    }
    if (response.headers.has('accept-ranges')) {
      responseHeaders.set('Accept-Ranges', response.headers.get('accept-ranges')!);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Error in proxy-video route:', error);
    return new Response('Error fetching remote video', { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
