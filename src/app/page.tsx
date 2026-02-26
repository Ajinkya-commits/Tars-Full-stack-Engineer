"use client";

import { useState, useEffect } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Sidebar } from "@/components/sidebar";
import { ChatView } from "@/components/chat-view";
import { NoChatSelected } from "@/components/empty-state";
import { usePresence } from "@/hooks/use-presence";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [activeConversationId, setActiveConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [isMobileShowingChat, setIsMobileShowingChat] = useState(false);

  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    if (isAuthenticated) {
      ensureUser();
    }
  }, [isAuthenticated, ensureUser]);

  usePresence();

  const handleSelectConversation = (id: Id<"conversations">) => {
    setActiveConversationId(id);
    setIsMobileShowingChat(true);
  };

  const handleBack = () => {
    setIsMobileShowingChat(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <div
        className={`${
          isMobileShowingChat ? "hidden" : "flex"
        } md:flex w-full md:w-80 lg:w-96 shrink-0`}
      >
        <Sidebar
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      <div
        className={`${
          isMobileShowingChat ? "flex" : "hidden"
        } md:flex flex-1 flex-col min-w-0`}
      >
        {activeConversationId ? (
          <ChatView conversationId={activeConversationId} onBack={handleBack} />
        ) : (
          <NoChatSelected />
        )}
      </div>
    </div>
  );
}
