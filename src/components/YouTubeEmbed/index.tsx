import React from 'react';

type Props = {
  url: string;
  title?: string;
  className?: string;
};

function parseTimeToSeconds(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return null;

  const [, hours, minutes, seconds] = match;
  if (!hours && !minutes && !seconds) return null;

  return (
    (hours ? Number.parseInt(hours, 10) * 3600 : 0) +
    (minutes ? Number.parseInt(minutes, 10) * 60 : 0) +
    (seconds ? Number.parseInt(seconds, 10) : 0)
  );
}

function extractYouTubeVideoId(rawUrl: string): {id: string; startSeconds?: number} | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, '');
  const pathname = parsedUrl.pathname.replace(/\/+$/, '');

  let id: string | null = null;

  if (hostname === 'youtu.be') {
    const candidate = pathname.split('/').filter(Boolean)[0];
    id = candidate ?? null;
  } else if (
    hostname === 'youtube.com' ||
    hostname === 'm.youtube.com' ||
    hostname === 'youtube-nocookie.com'
  ) {
    if (pathname === '/watch') {
      id = parsedUrl.searchParams.get('v');
    } else if (pathname.startsWith('/embed/')) {
      id = pathname.split('/').filter(Boolean)[1] ?? null;
    } else if (pathname.startsWith('/shorts/')) {
      id = pathname.split('/').filter(Boolean)[1] ?? null;
    }
  }

  if (!id || !/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;

  const startSeconds =
    parseTimeToSeconds(parsedUrl.searchParams.get('start')) ??
    parseTimeToSeconds(parsedUrl.searchParams.get('t')) ??
    undefined;

  return startSeconds ? {id, startSeconds} : {id};
}

export default function YouTubeEmbed({url, title = 'YouTube video', className}: Props) {
  const video = extractYouTubeVideoId(url);
  if (!video) {
    return (
      <a href={url} target='_blank' rel='noreferrer'>
        {url}
      </a>
    );
  }

  const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${video.id}`);
  embedUrl.searchParams.set('rel', '0');
  if (video.startSeconds) {
    embedUrl.searchParams.set('start', String(video.startSeconds));
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 960,
        margin: '1rem auto',
        paddingBottom: '56.25%',
        height: 0,
      }}
    >
      <iframe
        src={embedUrl.toString()}
        title={title}
        loading='lazy'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        allowFullScreen
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
        }}
      />
    </div>
  );
}

