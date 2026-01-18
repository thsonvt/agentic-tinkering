import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

const highlightColorValidator = v.union(
  v.literal('yellow'),
  v.literal('green'),
  v.literal('blue'),
  v.literal('pink')
);

/**
 * Create a highlight
 */
export const create = mutation({
  args: {
    contentId: v.optional(v.id('content')),
    webCaptureId: v.optional(v.id('webCaptures')),
    text: v.string(),
    color: highlightColorValidator,
    startOffset: v.number(),
    endOffset: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // Must have either contentId or webCaptureId
    if (!args.contentId && !args.webCaptureId) {
      throw new Error('Must specify contentId or webCaptureId');
    }

    return await ctx.db.insert('highlights', {
      userId,
      contentId: args.contentId,
      webCaptureId: args.webCaptureId,
      text: args.text,
      color: args.color,
      startOffset: args.startOffset,
      endOffset: args.endOffset,
      createdAt: Date.now(),
    });
  },
});

/**
 * Batch create highlights (for sync from extension)
 */
export const batchCreate = mutation({
  args: {
    webCaptureId: v.id('webCaptures'),
    highlights: v.array(
      v.object({
        text: v.string(),
        color: highlightColorValidator,
        startOffset: v.number(),
        endOffset: v.number(),
        createdAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const ids = [];
    for (const highlight of args.highlights) {
      const id = await ctx.db.insert('highlights', {
        userId,
        webCaptureId: args.webCaptureId,
        text: highlight.text,
        color: highlight.color,
        startOffset: highlight.startOffset,
        endOffset: highlight.endOffset,
        createdAt: highlight.createdAt,
      });
      ids.push(id);
    }
    return ids;
  },
});

/**
 * Delete a highlight
 */
export const remove = mutation({
  args: { id: v.id('highlights') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const highlight = await ctx.db.get(args.id);
    if (!highlight || highlight.userId !== userId) {
      throw new Error('Not found');
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * List highlights for a web capture
 */
export const listByWebCapture = query({
  args: { webCaptureId: v.id('webCaptures') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query('highlights')
      .withIndex('by_web_capture', (q) => q.eq('webCaptureId', args.webCaptureId))
      .collect();
  },
});

/**
 * List highlights for content (drafts/published)
 */
export const listByContent = query({
  args: { contentId: v.id('content') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query('highlights')
      .withIndex('by_content', (q) => q.eq('contentId', args.contentId))
      .collect();
  },
});

/**
 * List all highlights for current user (for highlights page)
 */
export const listAll = query({
  args: {
    color: v.optional(highlightColorValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let highlights;
    if (args.color) {
      highlights = await ctx.db
        .query('highlights')
        .withIndex('by_user_color', (q) =>
          q.eq('userId', userId).eq('color', args.color!)
        )
        .collect();
    } else {
      highlights = await ctx.db
        .query('highlights')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect();
    }

    return highlights;
  },
});
