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
import { useTyping } from "@/hooks/use-typing";
import { useSmartScroll } from "@/hooks/use-smart-scroll";
import { formatMessageTime } from "@/lib/format-date";
import { ArrowDown, ArrowLeft, Trash2 } from "lucide-react";
import { useEffect } from "react";

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

  const { scrollRef, bottomRef, showNewMessages, scrollToBottom } =
    useSmartScroll(messages?.length);

  const conversation = conversations?.find((c) => c._id === conversationId);
  const otherUser = conversation?.otherUser;

  // Mark conversation as read when new messages arrive
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

  const handleSend = (body: string) => {
    sendMessage({ conversationId, body });
    stopTyping();
    setTimeout(() => scrollToBottom(), 50);
  };

  const typingNames =
    typingUsers
      ?.filter((u): u is { name: string; image: string } => u !== null)
      .map((u) => u.name) ?? [];

  return (
    <div className="flex h-full flex-col">
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
        {otherUser && (
          <>
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
              <h2 className="text-sm font-semibold truncate">
                {otherUser.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {otherUser.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages && messages.length === 0 && <NoMessages />}
        {messages?.map((msg) => {
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
        <div ref={bottomRef} />
      </div>

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
