"use client";

import { useState, useRef, FormEvent } from "react";
import { Send, Paperclip, X, Loader2 } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="border-t bg-background">
      {selectedFile && (
        <div className="px-3 pt-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
            {previewUrl ? (
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
        <Button
          type="submit"
          size="icon"
          disabled={(!body.trim() && !selectedFile) || disabled || isSending}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
