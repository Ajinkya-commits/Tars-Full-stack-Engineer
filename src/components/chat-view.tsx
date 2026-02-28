"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageInput } from "@/components/message-input";
import { TypingIndicator } from "@/components/typing-indicator";
import { MessageReactions } from "@/components/message-reactions";
import { NoMessages } from "@/components/empty-state";
import {
  MessageListSkeleton,
  ChatHeaderSkeleton,
} from "@/components/skeletons";
import { useTyping } from "@/hooks/use-typing";
import { useSmartScroll } from "@/hooks/use-smart-scroll";
import { formatMessageTime } from "@/lib/format-date";
import {
  ArrowDown,
  ArrowLeft,
  Trash2,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface ChatViewProps {
  conversationId: Id<"conversations">;
  onBack?: () => void;
}

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const messages = useQuery(api.messages.getMessages, { conversationId });
  const me = useQuery(api.users.getMe);
  const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId });
  const conversations = useQuery(api.conversations.getMyConversations);

  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const markAsRead = useMutation(api.conversationMembers.markAsRead);
  const { handleTyping, stopTyping } = useTyping(conversationId);

  const [failedMessages, setFailedMessages] = useState<
    { id: number; body: string }[]
  >([]);
  const [nextFailId, setNextFailId] = useState(0);

  const { scrollRef, bottomRef, showNewMessages, scrollToBottom } =
    useSmartScroll(messages?.length);

  const conversation = conversations?.find((c) => c._id === conversationId);
  const otherUser = conversation?.otherUser;

  useEffect(() => {
    if (messages && messages.length > 0 && me) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== me._id) {
        markAsRead({
          conversationId,
          messageId: lastMessage._id,
        });
      }
    }
  }, [messages, me, conversationId, markAsRead]);

  // Clear failed messages when switching conversations
  useEffect(() => {
    setFailedMessages([]);
  }, [conversationId]);

  const attemptSend = useCallback(
    async (body: string, failId?: number) => {
      try {
        await sendMessage({ conversationId, body });
        if (failId !== undefined) {
          setFailedMessages((prev) => prev.filter((m) => m.id !== failId));
        }
      } catch {
        if (failId === undefined) {
          const id = nextFailId;
          setNextFailId((prev) => prev + 1);
          setFailedMessages((prev) => [...prev, { id, body }]);
        }
      }
    },
    [conversationId, sendMessage, nextFailId],
  );

  const handleSend = (body: string) => {
    attemptSend(body);
    stopTyping();
    setTimeout(() => scrollToBottom(), 50);
  };

  const handleRetry = (failId: number, body: string) => {
    attemptSend(body, failId);
  };

  const handleDismiss = (failId: number) => {
    setFailedMessages((prev) => prev.filter((m) => m.id !== failId));
  };

  const typingNames =
    typingUsers
      ?.filter((u): u is { name: string; image: string } => u !== null)
      .map((u) => u.name) ?? [];

  const isLoading = messages === undefined;

  return (
    <div className="flex h-full flex-col">
      {otherUser ? (
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="md:hidden shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={otherUser.image} />
              <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-500 text-white text-xs">
                {otherUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {otherUser.isOnline && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold truncate">{otherUser.name}</h2>
            <p className="text-xs text-muted-foreground">
              {otherUser.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
      ) : (
        <ChatHeaderSkeleton />
      )}

      {isLoading ? (
        <MessageListSkeleton />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
          {messages.length === 0 && <NoMessages />}
          {messages.map((msg) => {
            const isMe = me && msg.senderId === me._id;
            return (
              <div
                key={msg._id}
                className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
              >
                <div
                  className={`relative max-w-[75%] rounded-2xl px-3.5 py-2 ${
                    msg.deleted
                      ? "bg-muted/30 italic text-muted-foreground"
                      : isMe
                        ? "bg-blue-600 text-white"
                        : "bg-muted"
                  }`}
                >
                  {msg.deleted ? (
                    <p className="text-sm">This message was deleted</p>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed wrap-break-word">
                        {msg.body}
                      </p>
                      {isMe && !msg.deleted && (
                        <button
                          onClick={() => deleteMessage({ messageId: msg._id })}
                          className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </>
                  )}
                  <p
                    className={`mt-0.5 text-[10px] ${
                      isMe ? "text-blue-200" : "text-muted-foreground"
                    }`}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </p>
                  {!msg.deleted && (
                    <MessageReactions messageId={msg._id} isMe={!!isMe} />
                  )}
                </div>
              </div>
            );
          })}

          {failedMessages.map((fm) => (
            <div key={`fail-${fm.id}`} className="flex justify-end group">
              <div className="max-w-[75%] space-y-1">
                <div className="rounded-2xl px-3.5 py-2 bg-destructive/10 border border-destructive/30">
                  <p className="text-sm leading-relaxed wrap-break-word text-destructive">
                    {fm.body}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 text-[11px] text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>Failed to send</span>
                  <button
                    onClick={() => handleRetry(fm.id, fm.body)}
                    className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <RotateCw className="h-3 w-3" />
                    Retry
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    onClick={() => handleDismiss(fm.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      )}

      <TypingIndicator names={typingNames} />

      {showNewMessages && (
        <div className="flex justify-center -mt-12 relative z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => scrollToBottom()}
            className="rounded-full shadow-lg gap-1"
          >
            <ArrowDown className="h-3 w-3" />
            New messages
          </Button>
        </div>
      )}

      <MessageInput onSend={handleSend} onTyping={handleTyping} />
    </div>
  );
}
