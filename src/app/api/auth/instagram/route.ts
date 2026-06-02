import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'No userId provided' }, { status: 400 });
  }

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    scope: [
      'instagram_basic',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ].join(','),
    response_type: 'code',
    state: userId,
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params}`
  );
}
