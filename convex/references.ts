"use node";

import {v} from 'convex/values';
import {action} from './_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';
import crypto from 'node:crypto';
import {anyApi} from 'convex/server';
import type {Id} from './_generated/dataModel';

const MAX_HTML_BYTES = 2_000_000; // 2MB
const FETCH_TIMEOUT_MS = 20_000;

const api = anyApi;

function assertSafeUrl(input: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only http(s) URLs are supported');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Refusing URLs with credentials');
  }

  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    throw new Error('Refusing non-standard ports');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === '0.0.0.0'
  ) {
    throw new Error('Refusing to fetch local URLs');
  }

  // Block obvious private-network IP literals.
  // Note: this is not a complete SSRF defense (DNS could resolve to private IPs).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    const [a, b] = hostname.split('.').map((n) => Number.parseInt(n, 10));
    const isPrivate =
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 127;
    if (isPrivate) {
      throw new Error('Refusing to fetch private-network IPs');
    }
  }

  return parsed;
}

async function fetchTextWithLimit(url: string): Promise<{finalUrl: string; contentType: string | null; body: string}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (compatible; AgenticTinkeringBot/1.0; +https://agentic-tinkering.netlify.app/)',
      Accept: 'text/html,text/plain;q=0.9,*/*;q=0.8',
    };

    let currentUrl = url;
    for (let i = 0; i < 5; i++) {
      const resp = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers,
      });

      if ([301, 302, 303, 307, 308].includes(resp.status)) {
        const location = resp.headers.get('location');
        if (!location) {
          throw new Error('Redirect response missing location header');
        }
        const nextUrl = new URL(location, currentUrl).toString();
        assertSafeUrl(nextUrl);
        currentUrl = nextUrl;
        continue;
      }

      if (!resp.ok) {
        throw new Error(`Fetch failed (${resp.status})`);
      }

      const contentLength = resp.headers.get('content-length');
      if (contentLength && Number.parseInt(contentLength, 10) > MAX_HTML_BYTES) {
        throw new Error('Page is too large to import');
      }

      const buffer = await resp.arrayBuffer();
      if (buffer.byteLength > MAX_HTML_BYTES) {
        throw new Error('Page is too large to import');
      }

      const contentType = resp.headers.get('content-type');
      const body = new TextDecoder('utf-8', {fatal: false}).decode(buffer);
      return {finalUrl: currentUrl, contentType, body};
    }

    throw new Error('Too many redirects');
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number.parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const title = decodeHtmlEntities(match[1])
    .replace(/\s+/g, ' ')
    .trim();
  return title || null;
}

function stripJunk(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
}

function pickMainHtml(html: string): string {
  const cleaned = stripJunk(html);
  const candidates: string[] = [];

  const collect = (re: RegExp) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(cleaned))) {
      candidates.push(m[1] ?? '');
    }
  };

  collect(/<article[^>]*>([\s\S]*?)<\/article>/gi);
  collect(/<main[^>]*>([\s\S]*?)<\/main>/gi);
  collect(/<div[^>]*(?:id|class)=["'][^"']*(?:content|article|post|entry|markdown|main)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi);

  if (candidates.length === 0) return cleaned;

  let best = candidates[0];
  let bestScore = 0;
  for (const candidate of candidates) {
    const text = htmlToText(candidate);
    const score = text.length;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore > 200 ? best : cleaned;
}

function htmlToText(html: string): string {
  const cleaned = stripJunk(html)
    .replace(/<\/(p|div|section|article|main|header|footer|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<h([1-6])[^>]*>/gi, (_, level) => `\n\n${'#'.repeat(Number(level))} `)
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
      const label = decodeHtmlEntities(String(text)).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const url = String(href).trim();
      if (!label) return url;
      return `[${label}](${url})`;
    })
    .replace(/<[^>]+>/g, ' ');

  return decodeHtmlEntities(cleaned)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function slugFromUrl(url: string): string {
  const hash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 12);
  return `ref-${hash}`;
}

export const importFromUrl = action({
  args: {url: v.string()},
  handler: async (ctx, args): Promise<Id<'content'>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const initial = assertSafeUrl(args.url).toString();
    const {finalUrl, contentType, body} = await fetchTextWithLimit(initial);
    assertSafeUrl(finalUrl);

    if (
      contentType &&
      !contentType.toLowerCase().includes('text/html') &&
      !contentType.toLowerCase().includes('text/plain')
    ) {
      throw new Error('Unsupported content type for import');
    }

    const title =
      extractTitle(body) ??
      (() => {
        try {
          return new URL(finalUrl).hostname;
        } catch {
          return 'Imported reference';
        }
      })();

    const mainHtml = pickMainHtml(body);
    const text = htmlToText(mainHtml);
    if (!text || text.length < 50) {
      throw new Error('Could not extract readable content from this page');
    }

    const content = [`Source: [${finalUrl}](${finalUrl})`, '', '---', '', text].join('\n');

    const desiredSlug = slugFromUrl(finalUrl);
    const existing = (await ctx.runQuery(api.content.getBySlugForUser, {
      slug: desiredSlug,
    })) as
      | {
          _id: Id<'content'>;
          status: 'draft' | 'published';
          contentType: 'blog' | 'doc';
          slug: string;
        }
      | null;

    if (existing && existing.status === 'draft' && existing.contentType === 'doc') {
      await ctx.runMutation(api.content.update, {
        id: existing._id,
        title,
        content,
        description: `Imported from URL: ${finalUrl}`,
        docCategory: 'References',
      });
      return existing._id;
    }

    const slugAvailable = (await ctx.runQuery(api.content.checkSlugAvailable, {
      slug: desiredSlug,
    })) as boolean;

    const finalSlug = slugAvailable
      ? desiredSlug
      : `${desiredSlug}-${Date.now().toString(36)}`;

    const contentId = (await ctx.runMutation(api.content.create, {
      title,
      content,
      description: `Imported from URL: ${finalUrl}`,
      contentType: 'doc',
      docCategory: 'References',
      slug: finalSlug,
    })) as Id<'content'>;

    return contentId;
  },
});
