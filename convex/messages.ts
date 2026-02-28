import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
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
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        let fileUrl: string | null = null;
        if (msg.fileId) {
          fileUrl = await ctx.storage.getUrl(msg.fileId);
        }
        return { ...msg, sender, fileUrl };
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
