import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

async function getValidAccessToken(userId: string) {
  const doc = await adminDb
    .collection('users').doc(userId)
    .collection('integrations').doc('youtube')
    .get();

  if (!doc.exists) {
    throw new Error('YouTube integration not configured');
  }

  const data = doc.data()!;

  // If token is still valid (with 60 seconds buffer), return it
  if (Date.now() < data.expiresAt - 60000) {
    return data.accessToken;
  }

  // Token expired — refresh it automatically
  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: data.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const newTokens = await refreshRes.json();
  if (newTokens.error) {
    throw new Error(`Failed to refresh YouTube token: ${newTokens.error_description || newTokens.error}`);
  }

  // Update stored token
  await adminDb
    .collection('users').doc(userId)
    .collection('integrations').doc('youtube')
    .update({
      accessToken: newTokens.access_token,
      expiresAt: Date.now() + newTokens.expires_in * 1000,
    });

  return newTokens.access_token;
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'No userId' }, { status: 400 });

  try {
    const accessToken = await getValidAccessToken(userId);

    // 1. Get channel info
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const channelData = await channelRes.json();
    const channel = channelData.items?.[0];

    if (!channel) {
      return NextResponse.json({ error: 'YouTube channel not found' }, { status: 404 });
    }

    // 2. Get recent videos
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&order=date&maxResults=10&type=video`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const videosData = await videosRes.json();
    const videoIds = videosData.items?.map((v: any) => v.id.videoId).filter(Boolean).join(',');

    if (!videoIds) {
      return NextResponse.json({
        channel: {
          name: channel.snippet.title,
          subscribers: parseInt(channel.statistics.subscriberCount || '0'),
          totalViews: parseInt(channel.statistics.viewCount || '0'),
          videoCount: parseInt(channel.statistics.videoCount || '0'),
        },
        videos: [],
      });
    }

    // 3. Get real stats for each video
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const statsData = await statsRes.json();

    // 4. Shape the response for your component
    const videos = statsData.items?.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails?.medium?.url,
      publishedAt: video.snippet.publishedAt,
      views: parseInt(video.statistics.viewCount || '0'),
      likes: parseInt(video.statistics.likeCount || '0'),
      comments: parseInt(video.statistics.commentCount || '0'),
      platform: 'youtube',
      contentType: video.snippet.title?.toLowerCase().includes('#shorts') || video.snippet.title?.toLowerCase().includes('#short') ? 'short' : 'video',
    })) || [];

    return NextResponse.json({
      channel: {
        name: channel.snippet.title,
        subscribers: parseInt(channel.statistics.subscriberCount || '0'),
        totalViews: parseInt(channel.statistics.viewCount || '0'),
        videoCount: parseInt(channel.statistics.videoCount || '0'),
      },
      videos,
    });
  } catch (err: any) {
    console.error('Error fetching YouTube analytics:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
