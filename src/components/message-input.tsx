"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import { Send, Paperclip, X, Loader2, Mic, Square, Smile, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Id } from "../../convex/_generated/dataModel";

// A curated set of frequently used emojis grouped by category
const EMOJI_GROUPS = [
  {
    label: "Smileys",
    emojis: ["😀","😂","🤣","😊","😍","🥰","😎","😭","😢","😡","🤔","😴","🤗","😏","🙄","😬","🥺","😅","😆","😇","🤩","😋","😜","🤪","🤫","🤭","😷","🤒","🥱","😌"],
  },
  {
    label: "Gestures",
    emojis: ["👍","👎","👋","🤝","🙏","👏","🤜","🤛","✌️","🤞","👌","🤙","💪","👀","🫶","🙌","🤲","🫰","☝️","🖐️"],
  },
  {
    label: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💓","💗","💖","💘","💝","❣️","💔","❤️‍🔥","❤️‍🩹"],
  },
  {
    label: "Animals",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐸","🐵","🐔","🐧","🐦","🦆","🦅","🦋","🐝"],
  },
  {
    label: "Food",
    emojis: ["🍕","🍔","🌮","🌯","🍜","🍣","🍦","🎂","🍰","🧁","🍩","🍪","☕","🧋","🍺","🥂","🍾","🥤","🧃","🍫"],
  },
  {
    label: "Activities",
    emojis: ["⚽","🏀","🎮","🎲","🎯","🎭","🎨","🎤","🎵","🎶","🎸","🏆","🥇","🎁","🎉","🎊","🪄","🎪","🎠","🎢"],
  },
  {
    label: "Travel",
    emojis: ["🚀","✈️","🚂","🚗","🏠","🌍","🌊","🏔️","🌋","🏖️","🌅","🌃","🌆","🌉","🗺️","🧭","⛺","🌴","🌵","🌺"],
  },
  {
    label: "Objects",
    emojis: ["💡","🔥","⚡","💎","🔑","🔒","💻","📱","📷","🎥","📚","✉️","📌","🧲","💊","🧪","🔬","🌡️","⏰","🪞"],
  },
];

interface ReplyToMessage {
  _id: Id<"messages">;
  body: string;
  senderName: string;
  fileName?: string | null;
}

interface MessageInputProps {
  onSend: (body: string, file?: File, replyToId?: Id<"messages">) => void;
  onTyping: () => void;
  disabled?: boolean;
  replyTo?: ReplyToMessage | null;
  onCancelReply?: () => void;
}

export function MessageInput({
  onSend,
  onTyping,
  disabled,
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [body, setBody] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiGroup, setActiveEmojiGroup] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setBody((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? body.length;
    const end = input.selectionEnd ?? body.length;
    const newBody = body.slice(0, start) + emoji + body.slice(end);
    setBody(newBody);
    // Restore cursor position after emoji insert
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-message-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      // Microphone access denied or not available
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      chunksRef.current = [];
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed && !selectedFile) return;

    setIsSending(true);
    try {
      onSend(
        trimmed || (selectedFile ? selectedFile.name : ""),
        selectedFile ?? undefined,
        replyTo?._id,
      );
      setBody("");
      clearFile();
    } finally {
      setIsSending(false);
    }
  };

  const isAudioPreview = selectedFile?.type.startsWith("audio/");

  return (
    <div className="border-t bg-background">
      {/* Emoji Picker Panel */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="mx-3 mb-1 mt-2 rounded-xl border border-border bg-background shadow-xl overflow-hidden"
          style={{ maxHeight: "260px" }}
        >
          {/* Category tabs */}
          <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-hide">
            {EMOJI_GROUPS.map((group, i) => (
              <button
                key={group.label}
                onClick={() => setActiveEmojiGroup(i)}
                className={`px-3 py-1.5 text-[11px] font-medium shrink-0 transition-colors ${
                  activeEmojiGroup === i
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
          {/* Emoji grid */}
          <div className="grid grid-cols-10 gap-0 p-2 overflow-y-auto" style={{ maxHeight: "190px" }}>
            {EMOJI_GROUPS[activeEmojiGroup].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="text-xl h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reply Preview Banner */}
      {replyTo && (
        <div className="flex items-center gap-2 mx-3 mt-2 rounded-lg bg-muted/60 border-l-4 border-blue-500 px-3 py-2">
          <Reply className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-blue-400 truncate">
              {replyTo.senderName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.fileName && !replyTo.body
                ? `📎 ${replyTo.fileName}`
                : replyTo.body}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="shrink-0 rounded-full p-0.5 hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* File preview */}
      {selectedFile && !isAudioPreview && (
        <div className="px-3 pt-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
            {previewUrl && selectedFile.type.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-16 w-16 rounded-md object-cover"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Paperclip className="h-4 w-4" />
                <span className="truncate max-w-[200px]">
                  {selectedFile.name}
                </span>
              </div>
            )}
            <button
              onClick={clearFile}
              className="ml-auto rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {selectedFile && isAudioPreview && previewUrl && (
        <div className="px-3 pt-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
            <audio src={previewUrl} controls className="h-8 flex-1" />
            <button
              onClick={clearFile}
              className="rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center gap-3 p-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-mono text-red-400">
            {formatTime(recordingTime)}
          </span>
          <span className="text-sm text-muted-foreground flex-1">
            Recording...
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={stopRecording}
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Emoji button — extreme left */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={disabled || isSending}
            className={`shrink-0 transition-colors ${
              showEmojiPicker
                ? "text-blue-500 bg-blue-500/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Emoji"
          >
            <Smile className="h-4 w-4" />
          </Button>

          {/* Attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Input
            ref={inputRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              onTyping();
            }}
            placeholder={replyTo ? `Reply to ${replyTo.senderName}...` : "Type a message..."}
            disabled={disabled || isSending}
            className="flex-1 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-ring"
            autoFocus
          />
          {!body.trim() && !selectedFile ? (
            <Button
              type="button"
              size="icon"
              onClick={startRecording}
              disabled={disabled || isSending}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mic className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={
                (!body.trim() && !selectedFile) || disabled || isSending
              }
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
