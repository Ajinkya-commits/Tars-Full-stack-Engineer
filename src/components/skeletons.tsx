"use client";

export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg p-2.5 animate-pulse">
      <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 rounded bg-muted" />
          <div className="h-2.5 w-10 rounded bg-muted" />
        </div>
        <div className="h-3 w-40 rounded bg-muted" />
      </div>
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="p-2 space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessageSkeleton({ align }: { align: "left" | "right" }) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"} animate-pulse`}>
      <div className={`rounded-2xl px-3.5 py-2 space-y-1.5 ${
        align === "right" ? "bg-blue-600/20" : "bg-muted/60"
      }`}>
        <div className={`h-3 rounded ${align === "right" ? "w-36" : "w-44"} bg-muted/40`} />
        <div className={`h-3 rounded ${align === "right" ? "w-20" : "w-28"} bg-muted/40`} />
        <div className="h-2 w-12 rounded bg-muted/30" />
      </div>
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-3">
      <MessageSkeleton align="left" />
      <MessageSkeleton align="right" />
      <MessageSkeleton align="left" />
      <MessageSkeleton align="right" />
      <MessageSkeleton align="left" />
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 animate-pulse">
      <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-28 rounded bg-muted" />
        <div className="h-2.5 w-14 rounded bg-muted" />
      </div>
    </div>
  );
}
