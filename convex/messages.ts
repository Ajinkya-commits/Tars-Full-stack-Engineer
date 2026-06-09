import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      body: args.body,
      fileId: args.fileId,
      fileName: args.fileName,
      deleted: false,
      createdAt: Date.now(),
      replyToId: args.replyToId,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
    });

    const memberRecord = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", me._id)
      )
      .unique();

    if (memberRecord) {
      await ctx.db.patch(memberRecord._id, {
        lastReadMessageId: messageId,
      });
    }

    return messageId;
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Get all conversation members and their last read positions
    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Build a map: userId -> lastReadMessageCreatedAt
    const memberReadTimes: Record<string, number> = {};
    for (const member of members) {
      if (member.lastReadMessageId) {
        const lastReadMsg = await ctx.db.get(member.lastReadMessageId);
        if (lastReadMsg) {
          memberReadTimes[member.userId] = lastReadMsg.createdAt;
        }
      }
    }

    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        let fileUrl: string | null = null;
        if (msg.fileId) {
          fileUrl = await ctx.storage.getUrl(msg.fileId);
        }

        // Read receipt: list of userIds (other than sender) who have read up to >= this message
        const readBy: string[] = [];
        if (me && msg.senderId === me._id) {
          for (const member of members) {
            if (member.userId === msg.senderId) continue;
            const readTime = memberReadTimes[member.userId];
            if (readTime !== undefined && readTime >= msg.createdAt) {
              readBy.push(member.userId);
            }
          }
        }

        // Fetch replied-to message details
        let replyTo: {
          _id: string;
          body: string;
          senderName: string;
          fileUrl: string | null;
          fileName: string | null;
        } | null = null;

        if (msg.replyToId) {
          const originalMsg = await ctx.db.get(msg.replyToId);
          if (originalMsg) {
            const originalSender = await ctx.db.get(originalMsg.senderId);
            let originalFileUrl: string | null = null;
            if (originalMsg.fileId) {
              originalFileUrl = await ctx.storage.getUrl(originalMsg.fileId);
            }
            replyTo = {
              _id: originalMsg._id,
              body: originalMsg.deleted ? "This message was deleted" : originalMsg.body,
              senderName: originalSender?.name ?? "Unknown",
              fileUrl: originalFileUrl,
              fileName: originalMsg.fileName ?? null,
            };
          }
        }

        return { ...msg, sender, fileUrl, readBy, replyTo };
      })
    );

    return enriched;
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== me._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.messageId, { deleted: true });
  },
});
