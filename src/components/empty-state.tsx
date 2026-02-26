"use client";

import { ReactNode } from "react";
import { MessageSquare, Search, Users } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-[250px] text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function NoConversations() {
  return (
    <EmptyState
      icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
      title="No conversations yet"
      description="Search for a user and start chatting!"
    />
  );
}

export function NoMessages() {
  return (
    <EmptyState
      icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
      title="No messages yet"
      description="Send a message to start the conversation."
    />
  );
}

export function NoSearchResults() {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8 text-muted-foreground" />}
      title="No results found"
      description="Try a different search term."
    />
  );
}

export function NoChatSelected() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center gap-4 bg-background md:flex">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-blue-500/20 to-purple-500/20">
        <MessageSquare className="h-10 w-10 text-blue-400" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">ChatSync</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a conversation to start messaging
        </p>
      </div>
    </div>
  );
}
