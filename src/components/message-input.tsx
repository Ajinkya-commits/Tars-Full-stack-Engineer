"use client";

import { useState, FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSend: (body: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onTyping,
  disabled,
}: MessageInputProps) {
  const [body, setBody] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setBody("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t bg-background p-3"
    >
      <Input
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          onTyping();
        }}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-ring"
        autoFocus
      />
      <Button
        type="submit"
        size="icon"
        disabled={!body.trim() || disabled}
        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
