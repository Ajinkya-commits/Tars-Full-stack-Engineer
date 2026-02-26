# ChatSync

Real-time 1:1 chat app built with Next.js, Convex, and Clerk.

## Tech Stack

- **Next.js 16** (App Router + Turbopack)
- **Convex** — real-time database & backend functions
- **Clerk** — authentication (Google OAuth)
- **Tailwind CSS v4** + **shadcn/ui**
- **TypeScript**

## Features

- Real-time messaging via Convex subscriptions (no polling)
- Typing indicators with write-optimized debouncing
- Online/offline presence (30s heartbeat + tab visibility detection)
- Emoji reactions (👍 ❤️ 😂 😮 😢) — one per user per message
- Unread message badges with cursor-based tracking
- Smart auto-scroll (doesn't interrupt when reading old messages)
- Soft delete for messages
- Responsive layout (desktop: side-by-side, mobile: full-screen toggle)

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/Ajinkya-commits/Tars-Full-stack-Engineer.git
cd chat-app
npm install
```

### 2. Set up Clerk

- Create a project at [clerk.com](https://clerk.com)
- Enable Google OAuth in **User & Authentication → Social Connections**
- Go to **JWT Templates** → create a new **Convex** template → save it
- Copy your keys to `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 3. Set up Convex

```bash
npx convex dev
```

This will prompt you to create a Convex project and auto-populate `.env.local` with `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT`.

Then update `convex/auth.config.ts` with your Clerk domain:

```typescript
domain: "https://YOUR-CLERK-DOMAIN.clerk.accounts.dev",
```

You can find this in your Clerk dashboard under **API Keys**.

### 4. Run

Terminal 1:

```bash
npx convex dev
```

Terminal 2:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To test the chat, open a second browser window (incognito) and sign in with a different account.

## Project Structure

```
convex/           → backend (runs on Convex cloud)
  schema.ts       → database tables & indexes
  users.ts        → user auth & search
  conversations.ts → create/fetch conversations
  messages.ts     → send, fetch, delete messages
  reactions.ts    → emoji reactions (toggle)
  presence.ts     → online/offline heartbeat
  typing.ts       → typing indicators
  http.ts         → Clerk webhook handler

src/app/          → Next.js pages
src/components/   → React components (sidebar, chat, inputs)
src/hooks/        → custom hooks (presence, typing, scroll)
src/lib/          → utilities (timestamp formatting)
src/providers/    → Clerk + Convex provider wrapper
```

## Architecture Notes

**Why Convex instead of REST/WebSocket?**
Every `useQuery()` call is a live subscription — Convex pushes new data whenever the underlying DB changes. No extra WebSocket code, no polling intervals.

**Typing indicator optimization:**
The `useTyping` hook uses a ref-based flag to only write on state transitions (started typing / stopped typing), not on every keystroke. A burst of 50 keystrokes results in just 2 DB writes.

**Unread tracking:**
Uses a cursor approach — `conversationMembers.lastReadMessageId` stores the last message you've seen. Unread count = messages after that cursor from the other user.
