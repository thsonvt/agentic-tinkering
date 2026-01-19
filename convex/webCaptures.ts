import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

/**
 * Upsert a web capture (create or update by URL)
 */
export const upsert = mutation({
  args: {
    url: v.string(),
    canonicalUrl: v.string(),
    title: v.string(),
    content: v.string(),
    excerpt: v.optional(v.string()),
    siteName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const now = Date.now();

    // Check if capture already exists for this URL
    const existing = await ctx.db
      .query('webCaptures')
      .withIndex('by_user_url', (q) =>
        q.eq('userId', userId).eq('canonicalUrl', args.canonicalUrl)
      )
      .unique();

    if (existing) {
      // Update existing capture
      await ctx.db.patch(existing._id, {
        title: args.title,
        content: args.content,
        excerpt: args.excerpt,
        siteName: args.siteName,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new capture
    return await ctx.db.insert('webCaptures', {
      userId,
      url: args.url,
      canonicalUrl: args.canonicalUrl,
      title: args.title,
      content: args.content,
      excerpt: args.excerpt,
      siteName: args.siteName,
      capturedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get a specific web capture by ID
 */
export const get = query({
  args: { id: v.id('webCaptures') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const capture = await ctx.db.get(args.id);
    if (!capture || capture.userId !== userId) return null;

    return capture;
  },
});

/**
 * Get web capture by canonical URL (for checking if page was captured)
 */
export const getByUrl = query({
  args: { canonicalUrl: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query('webCaptures')
      .withIndex('by_user_url', (q) =>
        q.eq('userId', userId).eq('canonicalUrl', args.canonicalUrl)
      )
      .unique();
  },
});

/**
 * List all web captures for the current user
 * Supports both Convex user IDs and Google OAuth IDs for backward compatibility
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get the user's OAuth provider ID (Google sub claim) from authAccounts
    const authAccount = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .first();

    const providerAccountId = authAccount?.providerAccountId;

    // Query by Convex user ID first
    const capturesByConvexId = await ctx.db
      .query('webCaptures')
      .withIndex('by_user_updated', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();

    // Also query by OAuth provider ID if different (backward compatibility)
    let capturesByProviderId: typeof capturesByConvexId = [];
    if (providerAccountId && providerAccountId !== userId) {
      capturesByProviderId = await ctx.db
        .query('webCaptures')
        .withIndex('by_user_updated', (q) => q.eq('userId', providerAccountId))
        .order('desc')
        .collect();
    }

    // Merge and deduplicate by _id
    const allCaptures = [...capturesByConvexId, ...capturesByProviderId];
    const uniqueCaptures = allCaptures.filter(
      (capture, index, self) =>
        index === self.findIndex((c) => c._id === capture._id)
    );

    // Sort by updatedAt descending
    return uniqueCaptures.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Debug: List all web captures without filtering (to diagnose userId mismatch)
 */
export const debugListAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    // Get auth account info to see what fields are available
    const authAccount = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId!))
      .first();

    const allCaptures = await ctx.db.query('webCaptures').collect();

    return {
      currentUserId: userId,
      authAccount: authAccount ? {
        provider: authAccount.provider,
        providerAccountId: authAccount.providerAccountId,
        // Show all fields to understand the structure
        allFields: Object.keys(authAccount),
      } : null,
      captures: allCaptures.map(c => ({
        _id: c._id,
        title: c.title,
        storedUserId: c.userId,
        matchesCurrentUser: c.userId === userId,
        matchesProviderAccountId: c.userId === authAccount?.providerAccountId,
      })),
    };
  },
});

/**
 * Delete a web capture and its highlights
 */
export const remove = mutation({
  args: { id: v.id('webCaptures') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const capture = await ctx.db.get(args.id);
    if (!capture || capture.userId !== userId) {
      throw new Error('Not found');
    }

    // Delete associated highlights
    const highlights = await ctx.db
      .query('highlights')
      .withIndex('by_web_capture', (q) => q.eq('webCaptureId', args.id))
      .collect();

    for (const highlight of highlights) {
      await ctx.db.delete(highlight._id);
    }

    // Delete the capture
    await ctx.db.delete(args.id);
  },
});
