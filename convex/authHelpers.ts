import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

/**
 * Returns the canonical Convex `users` document ID for the current auth identity.
 *
 * In most cases `getAuthUserId(ctx)` already returns an `Id<'users'>`.
 * Some clients may authenticate with a provider token where the identity subject
 * is a provider identifier (e.g. Google `sub`). In that case, map it through
 * `authAccounts.providerAccountId -> authAccounts.userId`.
 */
export async function getCanonicalUserId(
  ctx: MutationCtx | QueryCtx
): Promise<Id<'users'> | null> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) return null;

  // Fast path: if it is a valid users doc ID, it should exist.
  try {
    const user = await ctx.db.get(rawUserId);
    if (user) return rawUserId;
  } catch {
    // If it's not a valid Id<'users'>, ctx.db.get() can throw.
  }

  const providerAccountId = String(rawUserId);
  const account = await ctx.db
    .query('authAccounts')
    .filter((q) => q.eq(q.field('providerAccountId'), providerAccountId))
    .first();

  if (!account) return null;
  return account.userId;
}
