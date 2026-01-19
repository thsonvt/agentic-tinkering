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
 * Supports multiple auth providers (Google OAuth, email OTP, etc.)
 * Handles case where user has different auth methods with different IDs
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get current user's auth accounts
    const currentUserAccounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .collect();

    // Get the user's email from their accounts
    const userEmail = currentUserAccounts.find(a =>
      a.providerAccountId?.includes('@')
    )?.providerAccountId;

    // Collect all possible user identifiers
    const userIdentifiers = new Set<string>([userId]);

    // Add all providerAccountIds from current user's accounts
    for (const account of currentUserAccounts) {
      if (account.providerAccountId) {
        userIdentifiers.add(account.providerAccountId);
      }
    }

    // If we have an email, find ALL authAccounts with that email
    // This handles Google OAuth accounts that may have different userId
    if (userEmail) {
      const allAccountsWithEmail = await ctx.db
        .query('authAccounts')
        .filter((q) => q.eq(q.field('providerAccountId'), userEmail))
        .collect();

      for (const account of allAccountsWithEmail) {
        userIdentifiers.add(account.userId);
        // Also check for Google accounts linked to same user
        const linkedAccounts = await ctx.db
          .query('authAccounts')
          .withIndex('userIdAndProvider', (q) => q.eq('userId', account.userId))
          .collect();
        for (const linked of linkedAccounts) {
          if (linked.providerAccountId) {
            userIdentifiers.add(linked.providerAccountId);
          }
        }
      }
    }

    // Query captures for each identifier and merge
    type WebCapture = {
      _id: any;
      _creationTime: number;
      userId: string;
      url: string;
      canonicalUrl: string;
      title: string;
      content: string;
      excerpt?: string;
      siteName?: string;
      capturedAt: number;
      updatedAt: number;
    };
    const allCaptures: WebCapture[] = [];
    for (const identifier of userIdentifiers) {
      const captures = await ctx.db
        .query('webCaptures')
        .withIndex('by_user_updated', (q) => q.eq('userId', identifier))
        .collect();
      allCaptures.push(...captures);
    }

    // Deduplicate by _id and sort by updatedAt descending
    const uniqueCaptures = allCaptures.filter(
      (capture, index, self) =>
        index === self.findIndex((c) => c._id === capture._id)
    );

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
 * Migrate webCaptures from old userId format to current Convex userId
 * Call this once to fix existing data
 */
export const migrateUserId = mutation({
  args: {
    oldUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // Find all captures with the old userId
    const captures = await ctx.db
      .query('webCaptures')
      .withIndex('by_user', (q) => q.eq('userId', args.oldUserId))
      .collect();

    // Update each capture to use the current Convex userId
    let updated = 0;
    for (const capture of captures) {
      await ctx.db.patch(capture._id, { userId });
      updated++;
    }

    return { updated, newUserId: userId };
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
