import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  QueryCtx,
} from "./_generated/server";

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  return user;
}

export const upsertUser = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        image: args.image,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      image: args.image,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

// Syncs Clerk identity into Convex on first app load
export const ensureUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isOnline: true,
        lastSeen: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "User",
      email: identity.email ?? "",
      image: identity.pictureUrl ?? "",
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

export const getMe = query({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) return [];

    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter((u) => u._id !== me._id);
  },
});

export const searchUsers = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (!me) return [];

    const allUsers = await ctx.db.query("users").collect();
    const searchLower = args.search.toLowerCase();

    return allUsers.filter(
      (u) =>
        u._id !== me._id &&
        (u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower))
    );
  },
});
