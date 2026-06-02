import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const userId = req.nextUrl.searchParams.get('state');

  if (!code || !userId) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  try {
    // Step A: Short-lived token
    const shortTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: process.env.META_REDIRECT_URI!,
        code: code,
      })
    );
    const shortTokenData = await shortTokenRes.json();
    if (shortTokenData.error) {
      console.error('Meta short token error:', shortTokenData);
      return NextResponse.json({ error: shortTokenData.error.message || 'Token exchange failed' }, { status: 500 });
    }
    const shortToken = shortTokenData.access_token;

    // Step B: Exchange for long-lived token (valid 60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        fb_exchange_token: shortToken,
      })
    );
    const longTokenData = await longTokenRes.json();
    if (longTokenData.error) {
      console.error('Meta long token error:', longTokenData);
      return NextResponse.json({ error: longTokenData.error.message || 'Token exchange failed' }, { status: 500 });
    }
    const { access_token: longToken, expires_in = 5184000 } = longTokenData; // Default to 60 days in seconds

    // Step C: Get the connected Instagram Business Account ID
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) {
      console.error('Meta pages error:', pagesData);
      return NextResponse.json({ error: pagesData.error.message || 'Failed to list FB pages' }, { status: 500 });
    }
    const pageId = pagesData.data?.[0]?.id;
    const pageToken = pagesData.data?.[0]?.access_token;

    if (!pageId || !pageToken) {
      return NextResponse.json({ error: 'No associated Facebook Page found. Ensure your Instagram Professional account is linked to a Facebook Page.' }, { status: 400 });
    }

    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
    );
    const igData = await igRes.json();
    if (igData.error) {
      console.error('Meta IG account fetch error:', igData);
      return NextResponse.json({ error: igData.error.message || 'Failed to find IG business account' }, { status: 500 });
    }
    const igAccountId = igData.instagram_business_account?.id;

    if (!igAccountId) {
      return NextResponse.json({ error: 'No Instagram Business account linked to this Facebook Page. Please link your Instagram Creator/Business account in Page Settings.' }, { status: 400 });
    }

    // Step D: Get real Instagram username
    const igDetailRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}?fields=username&access_token=${pageToken}`
    );
    const igDetailData = await igDetailRes.json();
    const username = igDetailData.username || 'Connected Instagram Profile';
    const formattedUsername = username.startsWith('@') ? username : `@${username}`;

    // Save everything to Firestore (server-side only)
    await adminDb
      .collection('users').doc(userId)
      .collection('integrations').doc('instagram')
      .set({
        longToken,
        pageToken,
        igAccountId,
        expiresAt: Date.now() + expires_in * 1000,
        connectedAt: new Date().toISOString(),
        username: username,
      });

    // Also update the main companyProfiles document so the UI connected state updates immediately!
    await adminDb
      .collection('users').doc(userId)
      .collection('companyProfiles').doc('primary-startup')
      .set({
        dmIgConnected: true,
        dmIgUsername: formattedUsername,
      });

    const origin = req.nextUrl.origin;
    return NextResponse.redirect(`${origin}/?tab=dm&connected=instagram`);
  } catch (err: any) {
    console.error('Instagram callback error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
