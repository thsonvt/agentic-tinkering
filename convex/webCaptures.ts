import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { getCanonicalUserId } from './authHelpers';

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
    const userId = await getCanonicalUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const rawUserId = await getAuthUserId(ctx);
    if (!rawUserId) throw new Error('Not authenticated');

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

    // If we previously stored captures under a provider identifier (e.g. Google `sub`),
    // migrate that capture to the canonical Convex user id on first write to avoid duplicates.
    if (rawUserId !== userId) {
      const legacy = await ctx.db
        .query('webCaptures')
        .withIndex('by_user_url', (q) =>
          q.eq('userId', rawUserId).eq('canonicalUrl', args.canonicalUrl)
        )
        .unique();

      if (legacy) {
        await ctx.db.patch(legacy._id, {
          userId,
          title: args.title,
          content: args.content,
          excerpt: args.excerpt,
          siteName: args.siteName,
          updatedAt: now,
        });
        return legacy._id;
      }
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
    const userId = await getCanonicalUserId(ctx);
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
    const userId = await getCanonicalUserId(ctx);
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
    const userId = await getCanonicalUserId(ctx);
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
 * Delete a web capture and its highlights
 */
export const remove = mutation({
  args: { id: v.id('webCaptures') },
  handler: async (ctx, args) => {
    const userId = await getCanonicalUserId(ctx);
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


/**
 * Migrate legacy web capture/highlight userId values for the current user.
 *
 * Older versions stored provider identifiers (e.g. Google subject) in `userId`.
 * This rewrites any records owned by those legacy identifiers to the current Convex Auth userId.
 */
export const migrateMyLegacyUserIds = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const canonicalUserId = await getCanonicalUserId(ctx);
    if (!canonicalUserId) throw new Error('Not authenticated');

    // Get current user's auth accounts
    const currentUserAccounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', canonicalUserId))
      .collect();

    // Best-effort email lookup
    const userEmail = currentUserAccounts.find((a) => a.providerAccountId?.includes('@'))
      ?.providerAccountId;

    const identifiers = new Set<string>([canonicalUserId]);

    // Add all providerAccountIds from current user's accounts
    for (const account of currentUserAccounts) {
      if (account.providerAccountId) {
        identifiers.add(account.providerAccountId);
      }
    }

    // If we have an email, find any other auth users that share it
    if (userEmail) {
      const allAccountsWithEmail = await ctx.db
        .query('authAccounts')
        .filter((q) => q.eq(q.field('providerAccountId'), userEmail))
        .collect();

      for (const account of allAccountsWithEmail) {
        identifiers.add(account.userId);

        const linkedAccounts = await ctx.db
          .query('authAccounts')
          .withIndex('userIdAndProvider', (q) => q.eq('userId', account.userId))
          .collect();

        for (const linked of linkedAccounts) {
          if (linked.providerAccountId) {
            identifiers.add(linked.providerAccountId);
          }
        }
      }
    }

    let webCapturesUpdated = 0;
    let highlightsUpdated = 0;

    // Rewrite web captures
    for (const identifier of identifiers) {
      if (identifier === canonicalUserId) continue;

      const captures = await ctx.db
        .query('webCaptures')
        .withIndex('by_user', (q) => q.eq('userId', identifier))
        .collect();

      for (const capture of captures) {
        if (capture.userId === canonicalUserId) continue;
        webCapturesUpdated += 1;
        if (!args.dryRun) {
          await ctx.db.patch(capture._id, { userId: canonicalUserId });
        }
      }

      const highlights = await ctx.db
        .query('highlights')
        .withIndex('by_user', (q) => q.eq('userId', identifier))
        .collect();

      for (const highlight of highlights) {
        if (highlight.userId === canonicalUserId) continue;
        highlightsUpdated += 1;
        if (!args.dryRun) {
          await ctx.db.patch(highlight._id, { userId: canonicalUserId });
        }
      }
    }

    return {
      dryRun: !!args.dryRun,
      canonicalUserId,
      identifiers: Array.from(identifiers),
      webCapturesUpdated,
      highlightsUpdated,
    };
  },
});


/**
 * Admin migration: rewrite legacy numeric userId values (Google `sub`) to Convex `users` document IDs.
 *
 * Run from your terminal (no user auth context required):
 *   npx convex run webCaptures:migrateLegacyUserIds '{"confirm":"migrate_legacy_user_ids","dryRun":true}' --prod
 */
export const migrateLegacyUserIds = mutation({
  args: {
    confirm: v.string(),
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== 'migrate_legacy_user_ids') {
      throw new Error('Refusing to run migration without correct confirm string');
    }

    const isNumeric = (value: string) => /^\d+$/.test(value);

    // Build mapping from Google subject -> Convex users doc id.
    const authAccounts = await ctx.db.query('authAccounts').collect();
    const subjectToUserId = new Map();
    for (const account of authAccounts) {
      if (typeof account.providerAccountId === 'string' && isNumeric(account.providerAccountId)) {
        subjectToUserId.set(account.providerAccountId, account.userId);
      }
    }

    const dryRun = !!args.dryRun;
    const limit = args.limit ?? Infinity;

    let webCapturesUpdated = 0;
    let highlightsUpdated = 0;
    let unmappedWebCaptures = 0;
    let unmappedHighlights = 0;
    const unmappedWebCaptureUserIds: string[] = [];
    const unmappedHighlightUserIds: string[] = [];
    const rememberUnmapped = (list: string[], userId: string) => {
      if (list.length >= 20) return;
      if (!list.includes(userId)) list.push(userId);
    };


    const captures = await ctx.db.query('webCaptures').collect();
    for (const capture of captures) {
      if (!isNumeric(capture.userId)) continue;
      const mapped = subjectToUserId.get(capture.userId);
      if (!mapped) {
        unmappedWebCaptures += 1;
        rememberUnmapped(unmappedWebCaptureUserIds, capture.userId);
        continue;
      }
      webCapturesUpdated += 1;
      if (!dryRun) {
        await ctx.db.patch(capture._id, { userId: mapped as unknown as string });
      }
      if (webCapturesUpdated + highlightsUpdated >= limit) {
        return {
          dryRun,
          limit,
          webCapturesUpdated,
          highlightsUpdated,
          unmappedWebCaptures,
          unmappedHighlights,
          unmappedWebCaptureUserIds,
          unmappedHighlightUserIds,
        };
      }
    }

    const highlights = await ctx.db.query('highlights').collect();
    for (const highlight of highlights) {
      if (!isNumeric(highlight.userId)) continue;
      const mapped = subjectToUserId.get(highlight.userId);
      if (!mapped) {
        unmappedHighlights += 1;
        rememberUnmapped(unmappedHighlightUserIds, highlight.userId);
        continue;
      }
      highlightsUpdated += 1;
      if (!dryRun) {
        await ctx.db.patch(highlight._id, { userId: mapped as unknown as string });
      }
      if (webCapturesUpdated + highlightsUpdated >= limit) {
        break;
      }
    }

    return {
      dryRun,
      limit: Number.isFinite(limit) ? limit : null,
      webCapturesUpdated,
      highlightsUpdated,
      unmappedWebCaptures,
      unmappedHighlights,
      unmappedWebCaptureUserIds,
      unmappedHighlightUserIds,
    };
  },
});
