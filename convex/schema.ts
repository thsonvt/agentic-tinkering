import {defineSchema, defineTable} from 'convex/server';
import {v} from 'convex/values';
import {authTables} from '@convex-dev/auth/server';

const schema = defineSchema({
  ...authTables,

  // Legacy drafts table (kept for migration)
  drafts: defineTable({
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_updated', ['userId', 'updatedAt']),

  // Unified content table for drafts and published content
  content: defineTable({
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    description: v.optional(v.string()),

    // Publication fields
    status: v.union(v.literal('draft'), v.literal('published')),
    contentType: v.union(v.literal('blog'), v.literal('doc')),
    slug: v.string(),

    // Blog-specific fields
    tags: v.optional(v.array(v.string())),

    // Doc-specific fields
    docCategory: v.optional(v.string()),
    docOrder: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_status_type', ['status', 'contentType'])
    .index('by_slug', ['slug'])
    .index('by_published_date', ['status', 'contentType', 'publishedAt']),

  // Web captures from Chrome extension
  webCaptures: defineTable({
    userId: v.id('users'),
    url: v.string(),
    canonicalUrl: v.string(),
    title: v.string(),
    content: v.string(),
    excerpt: v.optional(v.string()),
    siteName: v.optional(v.string()),
    capturedAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_url', ['userId', 'canonicalUrl'])
    .index('by_user_updated', ['userId', 'updatedAt']),

  // Highlights for content and web captures
  highlights: defineTable({
    userId: v.id('users'),
    contentId: v.optional(v.id('content')),
    webCaptureId: v.optional(v.id('webCaptures')),
    text: v.string(),
    color: v.union(
      v.literal('yellow'),
      v.literal('green'),
      v.literal('blue'),
      v.literal('pink')
    ),
    startOffset: v.number(),
    endOffset: v.number(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_content', ['contentId'])
    .index('by_web_capture', ['webCaptureId'])
    .index('by_user_color', ['userId', 'color']),
});

export default schema;
