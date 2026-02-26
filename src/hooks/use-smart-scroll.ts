"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Auto-scrolls if user is at bottom; shows "New messages" button if scrolled up
export function useSmartScroll(dependency: unknown) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const isAtBottomRef = useRef(true);

  const checkIfAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    const threshold = 100;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
    setShowNewMessages(false);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom = checkIfAtBottom();
      isAtBottomRef.current = atBottom;
      if (atBottom) {
        setShowNewMessages(false);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [checkIfAtBottom]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom(false);
    } else {
      setShowNewMessages(true);
    }
  }, [dependency, scrollToBottom]);

  return { scrollRef, bottomRef, showNewMessages, scrollToBottom };
}
