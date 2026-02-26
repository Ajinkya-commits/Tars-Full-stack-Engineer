"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const EMOJI_SET = ["👍", "❤️", "😂", "😮", "😢"];

interface MessageReactionsProps {
  messageId: Id<"messages">;
  isMe: boolean;
}

export function MessageReactions({ messageId, isMe }: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const reactions = useQuery(api.reactions.getReactions, { messageId });
  const toggleReaction = useMutation(api.reactions.toggleReaction);

  const handleReact = (emoji: string) => {
    toggleReaction({ messageId, emoji });
    setShowPicker(false);
  };

  const reactionList = reactions?.filter((r) => r.count > 0) ?? [];

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1 mt-1">
        {reactionList.map((r) => (
          <button
            key={r.emoji}
            onClick={() => handleReact(r.emoji)}
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-colors ${
              r.reacted
                ? "bg-blue-500/20 ring-1 ring-blue-500/40"
                : "bg-muted/60 hover:bg-muted"
            }`}
          >
            <span>{r.emoji}</span>
            <span
              className={`text-[10px] ${r.reacted ? "text-blue-400" : "text-muted-foreground"}`}
            >
              {r.count}
            </span>
          </button>
        ))}

        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
          title="Add reaction"
        >
          +
        </button>
      </div>

      {showPicker && (
        <div
          className={`absolute z-20 flex gap-1 rounded-lg bg-popover border shadow-lg p-1.5 ${
            isMe ? "right-0" : "left-0"
          } bottom-full mb-1`}
        >
          {EMOJI_SET.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-sm transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
