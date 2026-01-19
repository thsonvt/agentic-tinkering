import React from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import {useHistory} from '@docusaurus/router';
import {useQuery} from 'convex/react';
import {api} from '../../../convex/_generated/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '@site/src/pages/posts/styles.module.css';
import YouTubeEmbed from '@site/src/components/YouTubeEmbed';
import ReadingFocusToggle from '@site/src/components/ReadingFocusToggle';
import clsx from 'clsx';

function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    return (
      hostname === 'youtu.be' ||
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    );
  } catch {
    return false;
  }
}

function getStandaloneUrlFromParagraphNode(node: any): string | null {
  if (!node || node.type !== 'paragraph' || !Array.isArray(node.children)) return null;

  const children = node.children.filter((child: any) => {
    if (child?.type === 'text') return String(child.value ?? '').trim() !== '';
    return true;
  });

  if (children.length !== 1) return null;
  const only = children[0];

  if (only?.type === 'link' && typeof only.url === 'string') {
    return only.url;
  }

  if (only?.type === 'text' && typeof only.value === 'string') {
    const trimmed = only.value.trim();
    if (/^https?:\/\/\S+$/.test(trimmed)) return trimmed;
  }

  return null;
}

function getPostTimestamp(post: {publishedAt?: number; createdAt: number}): number {
  return post.publishedAt ?? post.createdAt;
}

// Helper to estimate reading time
function getReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

// Helper to get excerpt from content
function getExcerpt(content: string, maxLength = 200): string {
  // Remove markdown syntax for cleaner excerpt
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*|__/g, '') // Remove bold
    .replace(/\*|_/g, '') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

// Helper to group posts by year
function groupPostsByYear(posts: Array<{_id: string; title: string; slug: string; publishedAt?: number; createdAt: number}>) {
  const sortedPosts = [...posts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const groups: Record<string, typeof posts> = {};

  sortedPosts.forEach((post) => {
    const date = new Date(post.publishedAt || post.createdAt);
    const year = date.getFullYear().toString();
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(post);
  });

  // Sort years descending
  return Object.entries(groups).sort(([a], [b]) => parseInt(b) - parseInt(a));
}

export default function PostContent() {
  const location = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(location.search);
  const slug = searchParams.get('slug');

  // Get all published posts for sidebar
  const allPosts = useQuery(api.content.listPublished, {contentType: 'blog'});

  React.useEffect(() => {
    if (slug) return;
    if (!allPosts || allPosts.length === 0) return;

    const latest = allPosts.reduce((best, current) =>
      getPostTimestamp(current) > getPostTimestamp(best) ? current : best
    );

    history.replace(`/posts?slug=${latest.slug}`);
  }, [slug, allPosts, history]);

  // If slug provided, get specific post
  const post = useQuery(
    api.content.getBySlug,
    slug ? {slug, contentType: 'blog'} : 'skip'
  );

  const postsByYear = allPosts ? groupPostsByYear(allPosts) : [];

  return (
    <div className={styles.blogLayout}>
      <aside className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>Recent posts</h3>
        {postsByYear.map(([year, posts]) => (
          <div key={year} className={styles.yearGroup}>
            <h4 className={styles.yearTitle}>{year}</h4>
            <ul className={styles.sidebarList}>
              {posts.map((p) => (
                <li key={p._id} className={styles.sidebarItem}>
                  <Link
                    to={`/posts?slug=${p.slug}`}
                    className={clsx(styles.sidebarLink, slug === p.slug && styles.sidebarLinkActive)}
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <main className={styles.mainContent}>
        {!slug ? (
          <p className={styles.loading}>
            {allPosts === undefined ? 'Loading posts…' : allPosts?.length ? 'Loading…' : 'No published posts yet.'}
          </p>
        ) : post === undefined ? (
          <p className={styles.loading}>Loading…</p>
        ) : post === null ? (
          <div className={styles.container}>
            <h1>Post Not Found</h1>
            <p>The post you're looking for doesn't exist or has been unpublished.</p>
          </div>
        ) : (
          <article className={styles.container}>
            <header className={styles.postHeader}>
              <div className={styles.headerTopRow}>
                <h1>{post.title}</h1>
                <ReadingFocusToggle />
              </div>
              <div className={styles.headerMeta}>
                <span className={styles.date}>
                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className={styles.metaSeparator}>·</span>
                <span>{getReadingTime(post.content)}</span>
              </div>
              {post.tags && post.tags.length > 0 && (
                <div className={styles.tags}>
                  {post.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {post.description && <p className={styles.description}>{post.description}</p>}
            </header>

            <div className={styles.content} data-focus-scope="content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p({node, children, ...props}) {
                    const url = getStandaloneUrlFromParagraphNode(node);
                    if (url && isYouTubeUrl(url)) {
                      return <YouTubeEmbed url={url} />;
                    }
                    return (
                      <p data-focus-block="true" {...props}>
                        {children}
                      </p>
                    );
                  },
                  li({children, ...props}) {
                    return (
                      <li data-focus-block="true" {...props}>
                        {children}
                      </li>
                    );
                  },
                  blockquote({children, ...props}) {
                    return (
                      <blockquote data-focus-block="true" {...props}>
                        {children}
                      </blockquote>
                    );
                  },
                  h1({children, ...props}) {
                    return (
                      <h1 data-focus-block="true" {...props}>
                        {children}
                      </h1>
                    );
                  },
                  h2({children, ...props}) {
                    return (
                      <h2 data-focus-block="true" {...props}>
                        {children}
                      </h2>
                    );
                  },
                  h3({children, ...props}) {
                    return (
                      <h3 data-focus-block="true" {...props}>
                        {children}
                      </h3>
                    );
                  },
                  h4({children, ...props}) {
                    return (
                      <h4 data-focus-block="true" {...props}>
                        {children}
                      </h4>
                    );
                  },
                  h5({children, ...props}) {
                    return (
                      <h5 data-focus-block="true" {...props}>
                        {children}
                      </h5>
                    );
                  },
                  h6({children, ...props}) {
                    return (
                      <h6 data-focus-block="true" {...props}>
                        {children}
                      </h6>
                    );
                  },
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
