import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const userId = req.nextUrl.searchParams.get('state');

  if (!code || !userId) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.YOUTUBE_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      return NextResponse.json({ error: tokens.error_description || tokens.error }, { status: 500 });
    }

    // Get channel info to extract channel name
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const channelData = await channelRes.json();
    const channelName = channelData.items?.[0]?.snippet?.title || 'Connected YouTube Channel';

    // Save tokens to Firestore (server-side only)
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('integrations')
      .doc('youtube')
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
        connectedAt: new Date().toISOString(),
        channelName: channelName,
      });

    // Also update the main companyProfiles document so the UI connected state updates immediately!
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('companyProfiles')
      .doc('primary-startup')
      .set({
        dmYtConnected: true,
        dmYtChannelName: channelName,
      });

    const origin = req.nextUrl.origin;
    return NextResponse.redirect(`${origin}/?tab=dm&connected=youtube`);
  } catch (err: any) {
    console.error('YouTube callback error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
