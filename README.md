# Boma

Boma is an all-in-one home operating system for African households.

Live web app: https://boma-xi.vercel.app

## Apps

- `apps/web`: Next.js web app
- `apps/mobile`: Expo React Native app
- `packages/shared`: shared Supabase helpers and domain types
- `supabase/migrations`: database migrations

## Setup

Install dependencies:

```bash
npm install
```

Create local environment files and add your Supabase URL and anon key:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

For web, fill in `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

For mobile, fill in `apps/mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find both values in Supabase under **Project Settings > API**.

Run web:

```bash
npm run dev:web
```

Run mobile:

```bash
npm run dev:mobile
```

Validate:

```bash
npm run lint
npm run typecheck
npm run build -w @boma/web
```

## Phase 1

The first app surface is the bills tracker. It reads from the `bills` table once Supabase env vars and authentication are configured, and falls back to demo household bills while the product foundation is still being wired.
