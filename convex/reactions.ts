import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Toggle: adds reaction if not present, removes if already reacted
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    // Find all existing reactions by this user on this message
    const allMyReactions = await ctx.db
      .query("reactions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .collect();

    const myReactions = allMyReactions.filter((r) => r.userId === me._id);
    const sameEmoji = myReactions.find((r) => r.emoji === args.emoji);

    // If clicking the same emoji → remove it (toggle off)
    if (sameEmoji) {
      await ctx.db.delete(sameEmoji._id);
      return;
    }

    // Remove any previous reaction from this user (one reaction per user)
    for (const r of myReactions) {
      await ctx.db.delete(r._id);
    }

    await ctx.db.insert("reactions", {
      messageId: args.messageId,
      userId: me._id,
      emoji: args.emoji,
    });
  },
});

export const getReactions = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);

    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .collect();

    const grouped = new Map<string, { count: number; reacted: boolean }>();

    for (const r of reactions) {
      const existing = grouped.get(r.emoji) ?? { count: 0, reacted: false };
      existing.count++;
      if (me && r.userId === me._id) {
        existing.reacted = true;
      }
      grouped.set(r.emoji, existing);
    }

    return Array.from(grouped.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      reacted: data.reacted,
    }));
  },
});
