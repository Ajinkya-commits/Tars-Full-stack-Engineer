"use client";

import { useState, useRef, FormEvent } from "react";
import { Send, Paperclip, X, Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSend: (body: string, file?: File) => void;
  onTyping: () => void;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onTyping,
  disabled,
}: MessageInputProps) {
  const [body, setBody] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              onTyping();
            }}
            placeholder="Type a message..."
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
