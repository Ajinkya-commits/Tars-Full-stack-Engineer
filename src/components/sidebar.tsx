"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NoConversations, NoSearchResults } from "@/components/empty-state";
import { formatSidebarTime } from "@/lib/format-date";
import { Search, MessageSquarePlus } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

interface SidebarProps {
  activeConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
}

export function Sidebar({
  activeConversationId,
  onSelectConversation,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const me = useQuery(api.users.getMe);
  const conversations = useQuery(api.conversations.getMyConversations);
  const allUsers = useQuery(api.users.getAllUsers);
  const searchResults = useQuery(
    api.users.searchUsers,
    searchQuery.trim() ? { search: searchQuery.trim() } : "skip",
  );

  const getOrCreateConversation = useMutation(
    api.conversations.getOrCreateConversation,
  );

  const handleUserClick = async (userId: Id<"users">) => {
    const conversationId = await getOrCreateConversation({
      otherUserId: userId,
    });
    onSelectConversation(conversationId);
    setSearchQuery("");
    setIsSearchingUsers(false);
  };

  const usersToShow = searchQuery.trim()
    ? searchResults
    : isSearchingUsers
      ? allUsers
      : null;

  return (
    <div className="flex h-full w-full flex-col border-r bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
          <h1 className="text-lg font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            ChatSync
          </h1>
        </div>
        <button
          onClick={() => setIsSearchingUsers(!isSearchingUsers)}
          className="rounded-lg p-2 hover:bg-muted transition-colors"
          title="New conversation"
        >
          <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) setIsSearchingUsers(true);
            }}
            onFocus={() => setIsSearchingUsers(true)}
            placeholder="Search users..."
            className="pl-9 bg-muted/50 border-none h-9 text-sm"
          />
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        {isSearchingUsers && (
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Users
            </p>
            {!usersToShow && (
              <p className="px-2 py-4 text-sm text-center text-muted-foreground">
                Loading users...
              </p>
            )}
            {usersToShow && usersToShow.length === 0 && <NoSearchResults />}
            {usersToShow?.map((user) => (
              <button
                key={user._id}
                onClick={() => handleUserClick(user._id)}
                className="flex w-full items-center gap-3 rounded-lg p-2.5 hover:bg-muted/70 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.image} />
                    <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-500 text-white text-xs">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            ))}
            <Separator className="my-2" />
          </div>
        )}

        {!isSearchingUsers && (
          <div className="p-2">
            {conversations && conversations.length === 0 && <NoConversations />}
            {conversations?.map((conv) => {
              const isActive = activeConversationId === conv._id;
              return (
                <button
                  key={conv._id}
                  onClick={() => {
                    onSelectConversation(conv._id);
                    setIsSearchingUsers(false);
                    setSearchQuery("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg p-2.5 transition-colors ${
                    isActive ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={conv.otherUser?.image} />
                      <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-500 text-white text-xs">
                        {conv.otherUser?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    {conv.otherUser?.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate">
                        {conv.otherUser?.name ?? "Unknown"}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {formatSidebarTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate pr-2">
                        {conv.lastMessage
                          ? conv.lastMessage.deleted
                            ? "Message deleted"
                            : conv.lastMessage.body
                          : "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge
                          variant="default"
                          className="h-5 min-w-5 shrink-0 rounded-full bg-blue-600 px-1.5 text-[10px] font-bold hover:bg-blue-600"
                        >
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
