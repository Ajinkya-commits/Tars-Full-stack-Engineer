import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Typing status with 2-second auto-expiry to prevent stale indicators
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) return;

    const existing = await ctx.db
      .query("typingStatus")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", me._id)
      )
      .unique();

    if (args.isTyping) {
      const expiresAt = Date.now() + 2000;
      if (existing) {
        await ctx.db.patch(existing._id, { expiresAt });
      } else {
        await ctx.db.insert("typingStatus", {
          conversationId: args.conversationId,
          userId: me._id,
          expiresAt,
        });
      }
    } else {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
  },
});

export const getTypingUsers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) return [];

    const now = Date.now();
    const typingRecords = await ctx.db
      .query("typingStatus")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const activeTyping = typingRecords.filter(
      (t) => t.userId !== me._id && t.expiresAt > now
    );

    const users = await Promise.all(
      activeTyping.map(async (t) => {
        const user = await ctx.db.get(t.userId);
        return user ? { name: user.name, image: user.image } : null;
      })
    );

    return users.filter(Boolean);
  },
});
