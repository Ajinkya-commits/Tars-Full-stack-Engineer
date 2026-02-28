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
  FileText,
  Download,
  Users,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface LightboxImage {
  url: string;
  name: string;
}

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
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const markAsRead = useMutation(api.conversationMembers.markAsRead);
  const { handleTyping, stopTyping } = useTyping(conversationId);

  const [failedMessages, setFailedMessages] = useState<
    { id: number; body: string }[]
  >([]);
  const [nextFailId, setNextFailId] = useState(0);
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  const { scrollRef, bottomRef, showNewMessages, scrollToBottom } =
    useSmartScroll(messages?.length);

  const conversation = conversations?.find((c) => c._id === conversationId);
  const otherUser = conversation?.otherUser;

  const groupMembers = useQuery(
    api.conversations.getGroupMembers,
    conversation?.isGroup ? { conversationId } : "skip",
  );

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

  useEffect(() => {
    setFailedMessages([]);
  }, [conversationId]);

  const attemptSend = useCallback(
    async (body: string, file?: File, failId?: number) => {
      try {
        let fileId: Id<"_storage"> | undefined;
        let fileName: string | undefined;

        if (file) {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          const { storageId } = await result.json();
          fileId = storageId;
          fileName = file.name;
        }

        await sendMessage({ conversationId, body, fileId, fileName });
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
    [conversationId, sendMessage, generateUploadUrl, nextFailId],
  );

  const handleSend = (body: string, file?: File) => {
    attemptSend(body, file);
    stopTyping();
    setTimeout(() => scrollToBottom(), 50);
  };

  const handleRetry = (failId: number, body: string) => {
    attemptSend(body, undefined, failId);
  };

  const handleDismiss = (failId: number) => {
    setFailedMessages((prev) => prev.filter((m) => m.id !== failId));
  };

  const typingNames =
    typingUsers
      ?.filter((u): u is { name: string; image: string } => u !== null)
      .map((u) => u.name) ?? [];

  const isLoading = messages === undefined;

  const isImageFile = (name?: string | null) => {
    if (!name) return false;
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name);
  };

  const isAudioFile = (name?: string | null) => {
    if (!name) return false;
    return /\.(webm|mp3|wav|ogg|m4a|aac)$/i.test(name);
  };

  return (
    <div className="flex h-full flex-col">
      {conversation ? (
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
          {conversation.isGroup ? (
            <>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-linear-to-br from-indigo-500 to-pink-500 text-white">
                  <Users className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold truncate">
                  {conversation.name}
                </h2>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {conversation.memberCount} members
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${showMembers ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            </>
          ) : otherUser ? (
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
          ) : null}
        </div>
      ) : (
        <ChatHeaderSkeleton />
      )}

      {showMembers && groupMembers && (
        <div className="border-b px-4 py-2 bg-muted/30 space-y-1 max-h-48 overflow-y-auto">
          {groupMembers.map((member) => (
            <div key={member._id} className="flex items-center gap-2 py-1">
              <div className="relative">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.image} />
                  <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-500 text-white text-[8px]">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {member.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background" />
                )}
              </div>
              <span className="text-xs truncate">{member.name}</span>
              {me && member._id === me._id && (
                <span className="text-[10px] text-muted-foreground">(you)</span>
              )}
            </div>
          ))}
        </div>
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
                      {conversation?.isGroup && !isMe && msg.sender && (
                        <p className="text-[10px] font-semibold mb-0.5 text-blue-400">
                          {msg.sender.name}
                        </p>
                      )}
                      {msg.fileUrl && isImageFile(msg.fileName) && (
                        <img
                          src={msg.fileUrl}
                          alt={msg.fileName || "Image"}
                          onClick={() =>
                            setLightbox({
                              url: msg.fileUrl!,
                              name: msg.fileName || "Image",
                            })
                          }
                          className="rounded-lg max-h-64 w-auto mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      )}

                      {msg.fileUrl && isAudioFile(msg.fileName) && (
                        <audio
                          src={msg.fileUrl}
                          controls
                          className="max-w-[240px] h-8 mb-1"
                        />
                      )}

                      {msg.fileUrl &&
                        !isImageFile(msg.fileName) &&
                        !isAudioFile(msg.fileName) && (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 rounded-lg p-2 mb-1.5 transition-colors ${
                              isMe
                                ? "bg-blue-700/50 hover:bg-blue-700/70"
                                : "bg-background/50 hover:bg-background/70"
                            }`}
                          >
                            <FileText className="h-5 w-5 shrink-0" />
                            <span className="text-xs truncate flex-1">
                              {msg.fileName}
                            </span>
                            <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          </a>
                        )}

                      {msg.body &&
                        !(msg.fileUrl && msg.body === msg.fileName) && (
                          <p className="text-sm leading-relaxed wrap-break-word">
                            {msg.body}
                          </p>
                        )}

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

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}
          tabIndex={0}
        >
          <img
            src={lightbox.url}
            alt={lightbox.name}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
