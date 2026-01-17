import {v} from 'convex/values';
import {query, mutation} from './_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';

// Helper to generate URL-friendly slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

// List user's content (authenticated)
export const list = query({
  args: {
    status: v.optional(v.union(v.literal('draft'), v.literal('published'))),
    contentType: v.optional(v.union(v.literal('blog'), v.literal('doc'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let q = ctx.db.query('content').withIndex('by_user', (q) => q.eq('userId', userId));

    const items = await q.collect();

    // Filter by status and contentType if provided
    return items
      .filter((item) => !args.status || item.status === args.status)
      .filter((item) => !args.contentType || item.contentType === args.contentType)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Get single content item by ID (authenticated, owner only)
export const get = query({
  args: {id: v.id('content')},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const content = await ctx.db.get(args.id);
    if (!content || content.userId !== userId) return null;
    return content;
  },
});

// Get published content by slug (public)
export const getBySlug = query({
  args: {
    slug: v.string(),
    contentType: v.union(v.literal('blog'), v.literal('doc')),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query('content')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();

    if (!content || content.status !== 'published' || content.contentType !== args.contentType) {
      return null;
    }
    return content;
  },
});

// Get content by slug (authenticated, owner only)
export const getBySlugForUser = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const content = await ctx.db
      .query('content')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();

    if (!content || content.userId !== userId) return null;
    return content;
  },
});

// List all published content (public)
export const listPublished = query({
  args: {
    contentType: v.union(v.literal('blog'), v.literal('doc')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query('content')
      .withIndex('by_published_date', (q) =>
        q.eq('status', 'published').eq('contentType', args.contentType)
      )
      .order('desc');

    return args.limit ? await q.take(args.limit) : await q.collect();
  },
});

// Check if slug is available
export const checkSlugAvailable = query({
  args: {
    slug: v.string(),
    excludeId: v.optional(v.id('content')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('content')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();

    if (!existing) return true;
    if (args.excludeId && existing._id === args.excludeId) return true;
    return false;
  },
});

// Create new content
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
    contentType: v.union(v.literal('blog'), v.literal('doc')),
    slug: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    docCategory: v.optional(v.string()),
    docOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const slug = args.slug || generateSlug(args.title);

    // Check slug uniqueness
    const existing = await ctx.db
      .query('content')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first();

    if (existing) {
      throw new Error('Slug already exists. Please choose a different title or slug.');
    }

    const now = Date.now();
    return await ctx.db.insert('content', {
      userId,
      title: args.title,
      content: args.content,
      description: args.description,
      status: 'draft',
      contentType: args.contentType,
      slug,
      tags: args.tags,
      docCategory: args.docCategory,
      docOrder: args.docOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update existing content
export const update = mutation({
  args: {
    id: v.id('content'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    description: v.optional(v.string()),
    slug: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    docCategory: v.optional(v.string()),
    docOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error('Content not found');
    }

    // Check slug uniqueness if changing
    const newSlug = args.slug;
    if (newSlug && newSlug !== existing.slug) {
      const slugExists = await ctx.db
        .query('content')
        .withIndex('by_slug', (q) => q.eq('slug', newSlug))
        .first();

      if (slugExists && slugExists._id !== args.id) {
        throw new Error('Slug already exists');
      }
    }

    const {id, ...updates} = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Publish content
export const publish = mutation({
  args: {
    id: v.id('content'),
    slug: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    docCategory: v.optional(v.string()),
    docOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const content = await ctx.db.get(args.id);
    if (!content || content.userId !== userId) {
      throw new Error('Content not found');
    }

    // Check/update slug if provided
    const newSlug = args.slug;
    const finalSlug = newSlug ?? content.slug;
    if (newSlug && newSlug !== content.slug) {
      const slugExists = await ctx.db
        .query('content')
        .withIndex('by_slug', (q) => q.eq('slug', newSlug))
        .first();

      if (slugExists && slugExists._id !== args.id) {
        throw new Error('Slug already exists');
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: 'published',
      slug: finalSlug,
      tags: args.tags ?? content.tags,
      docCategory: args.docCategory ?? content.docCategory,
      docOrder: args.docOrder ?? content.docOrder,
      publishedAt: content.publishedAt || now,
      updatedAt: now,
    });
  },
});

// Unpublish content (revert to draft)
export const unpublish = mutation({
  args: {id: v.id('content')},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const content = await ctx.db.get(args.id);
    if (!content || content.userId !== userId) {
      throw new Error('Content not found');
    }

    await ctx.db.patch(args.id, {
      status: 'draft',
      updatedAt: Date.now(),
    });
  },
});

// Delete content
export const remove = mutation({
  args: {id: v.id('content')},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const content = await ctx.db.get(args.id);
    if (!content || content.userId !== userId) {
      throw new Error('Content not found');
    }

    await ctx.db.delete(args.id);
  },
});
