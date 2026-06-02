import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'No userId' }, { status: 400 });

  try {
    const doc = await adminDb
      .collection('users').doc(userId)
      .collection('integrations').doc('instagram')
      .get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Instagram integration not configured' }, { status: 404 });
    }

    const { igAccountId, pageToken } = doc.data()!;

    // 1. Get account info + follower count
    const accountRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}?fields=name,username,followers_count,media_count,profile_picture_url&access_token=${pageToken}`
    );
    const account = await accountRes.json();
    if (account.error) {
      console.error('Error fetching Instagram account info:', account.error);
      return NextResponse.json({ error: account.error.message || 'Failed to fetch account info' }, { status: 500 });
    }

    // 2. Get recent media (posts, reels, carousels)
    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=id,caption,media_type,timestamp,thumbnail_url,permalink&limit=12&access_token=${pageToken}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) {
      console.error('Error fetching Instagram media list:', mediaData.error);
      return NextResponse.json({ error: mediaData.error.message || 'Failed to fetch media list' }, { status: 500 });
    }

    // 3. Get insights for each post (wrapped in a try-catch for maximum reliability)
    const posts = await Promise.all(
      (mediaData.data || []).map(async (post: any) => {
        try {
          const insightRes = await fetch(
            `https://graph.facebook.com/v19.0/${post.id}/insights?metric=reach,impressions,likes,comments,shares,saved&access_token=${pageToken}`
          );
          const insights = await insightRes.json();

          // Shape insights into a flat object
          const metrics: Record<string, number> = {};
          if (insights.data) {
            insights.data.forEach((m: any) => {
              metrics[m.name] = m.values?.[0]?.value || 0;
            });
          }

          return {
            id: post.id,
            caption: post.caption || '',
            contentType: post.media_type?.toLowerCase(), // IMAGE, VIDEO, CAROUSEL_ALBUM
            publishedAt: post.timestamp,
            permalink: post.permalink,
            reach: metrics.reach || 0,
            impressions: metrics.impressions || 0,
            likes: metrics.likes || 0,
            comments: metrics.comments || 0,
            shares: metrics.shares || 0,
            saved: metrics.saved || 0,
            platform: 'instagram',
          };
        } catch (postErr) {
          console.warn(`Could not load insights for post ${post.id}:`, postErr);
          // Return default fields with zeroed metrics rather than failing the whole request
          return {
            id: post.id,
            caption: post.caption || '',
            contentType: post.media_type?.toLowerCase(),
            publishedAt: post.timestamp,
            permalink: post.permalink,
            reach: 0,
            impressions: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            saved: 0,
            platform: 'instagram',
          };
        }
      })
    );

    return NextResponse.json({
      account: {
        username: account.username || 'unknown',
        followers: account.followers_count || 0,
        mediaCount: account.media_count || 0,
      },
      posts,
    });
  } catch (err: any) {
    console.error('Error in Instagram analytics route:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
