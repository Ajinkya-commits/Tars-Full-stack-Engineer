import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const getOrCreateConversation = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    const allConversations = await ctx.db.query("conversations").collect();
    const existing = allConversations.find(
      (c) =>
        !c.isGroup &&
        c.participants.length === 2 &&
        c.participants.includes(me._id) &&
        c.participants.includes(args.otherUserId)
    );

    if (existing) return existing._id;

    const conversationId = await ctx.db.insert("conversations", {
      isGroup: false,
      participants: [me._id, args.otherUserId],
      createdAt: Date.now(),
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: me._id,
    });
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: args.otherUserId,
    });

    return conversationId;
  },
});

export const createGroupConversation = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    if (args.memberIds.length < 2) {
      throw new Error("Groups need at least 2 other members");
    }

    const allParticipants = [me._id, ...args.memberIds];

    const conversationId = await ctx.db.insert("conversations", {
      isGroup: true,
      name: args.name,
      participants: allParticipants,
      createdAt: Date.now(),
    });

    for (const userId of allParticipants) {
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId,
      });
    }

    return conversationId;
  },
});

export const getMyConversations = query({
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) return [];

    const allConversations = await ctx.db.query("conversations").collect();
    const myConversations = allConversations.filter((c) =>
      c.participants.includes(me._id)
    );

    const enriched = await Promise.all(
      myConversations.map(async (conv) => {
        let otherUser = null;
        if (!conv.isGroup) {
          const otherUserId = conv.participants.find((p) => p !== me._id);
          otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;
        }

        const lastMessage = conv.lastMessageId
          ? await ctx.db.get(conv.lastMessageId)
          : null;

        const memberRecord = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversationId_userId", (q) =>
            q.eq("conversationId", conv._id).eq("userId", me._id)
          )
          .unique();

        let unreadCount = 0;
        if (memberRecord) {
          const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) =>
              q.eq("conversationId", conv._id)
            )
            .collect();

          if (memberRecord.lastReadMessageId) {
            const lastReadMsg = await ctx.db.get(
              memberRecord.lastReadMessageId
            );
            if (lastReadMsg) {
              unreadCount = messages.filter(
                (m) =>
                  m.createdAt > lastReadMsg.createdAt &&
                  m.senderId !== me._id
              ).length;
            }
          } else {
            unreadCount = messages.filter(
              (m) => m.senderId !== me._id
            ).length;
          }
        }

        return {
          ...conv,
          otherUser,
          memberCount: conv.participants.length,
          lastMessage,
          unreadCount,
        };
      })
    );

    return enriched.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.createdAt;
      const bTime = b.lastMessage?.createdAt ?? b.createdAt;
      return bTime - aTime;
    });
  },
});

export const getGroupMembers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return [];

    const members = await Promise.all(
      conv.participants.map(async (userId) => {
        const user = await ctx.db.get(userId);
        return user
          ? { _id: user._id, name: user.name, image: user.image, isOnline: user.isOnline }
          : null;
      })
    );

    return members.filter((m) => m !== null);
  },
});
