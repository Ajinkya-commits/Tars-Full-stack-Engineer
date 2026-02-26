import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const heartbeat = mutation({
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) return;

    await ctx.db.patch(me._id, {
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

export const setOffline = mutation({
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) return;

    await ctx.db.patch(me._id, {
      isOnline: false,
      lastSeen: Date.now(),
    });
  },
});

export const getUserPresence = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    };
  },
});
