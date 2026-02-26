"use client";

import { useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Only writes to DB on state transitions (not every keystroke)
export function useTyping(conversationId: Id<"conversations"> | null) {
  const setTyping = useMutation(api.typing.setTyping);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleTyping = useCallback(() => {
    if (!conversationId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTyping({ conversationId, isTyping: true });
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setTyping({ conversationId, isTyping: false });
    }, 2000);
  }, [conversationId, setTyping]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    isTypingRef.current = false;
    setTyping({ conversationId, isTyping: false });
  }, [conversationId, setTyping]);

  return { handleTyping, stopTyping };
}
