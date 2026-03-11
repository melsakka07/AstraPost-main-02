
import { NextResponse } from 'next/server';
import { getLinkPreview } from 'link-preview-js';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const data = await getLinkPreview(url, {
      followRedirects: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      timeout: 5000
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Link preview error:", error);
    // Return empty success so UI doesn't break, or 400
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 200 }); 
  }
}
