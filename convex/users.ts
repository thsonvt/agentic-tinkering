import {query} from './_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Get the email from authAccounts table (where Convex Auth stores it)
    const authAccount = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .first();

    return {
      ...user,
      email: authAccount?.providerAccountId || user.email || null,
    };
  },
});
