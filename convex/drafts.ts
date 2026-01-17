import {v} from 'convex/values';
import {query, mutation} from './_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';

// List user's drafts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query('drafts')
      .withIndex('by_user_updated', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();
  },
});

// Get single draft
export const get = query({
  args: {id: v.id('drafts')},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const draft = await ctx.db.get(args.id);
    if (!draft || draft.userId !== userId) return null;
    return draft;
  },
});

// Create draft
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const now = Date.now();
    return await ctx.db.insert('drafts', {
      userId,
      title: args.title,
      content: args.content,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update draft
export const update = mutation({
  args: {
    id: v.id('drafts'),
    title: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const draft = await ctx.db.get(args.id);
    if (!draft || draft.userId !== userId) {
      throw new Error('Draft not found');
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      content: args.content,
      description: args.description,
      updatedAt: Date.now(),
    });
  },
});

// Delete draft
export const remove = mutation({
  args: {id: v.id('drafts')},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const draft = await ctx.db.get(args.id);
    if (!draft || draft.userId !== userId) {
      throw new Error('Draft not found');
    }

    await ctx.db.delete(args.id);
  },
});
