# Next.js + Convex + WorkOS Starter Reference

## Purpose

This file is a build reference for a future starter template that combines:

1. Next.js App Router for the web app.
2. Convex for backend functions, database, and generated client API.
3. WorkOS AuthKit for authentication.
4. A pnpm + Turborepo monorepo layout.

It is intentionally prescriptive. It tells you what files to create, where they go, which packages to install, which environment variables to define, how the auth flow works, and how the current repository maps to the starter.

This document is based on the working integration in this repository, but it normalizes a few inconsistencies so you can use it as a clean starting point in a future session.

## Canonical Stack Snapshot

### Monorepo shape

Use a small monorepo, even if the first version only ships a web app. The split keeps responsibilities clean:

1. `apps/web` owns the Next.js app, middleware, auth routes, callback route, and React provider wiring.
2. `apps/backend` owns Convex schema, queries, mutations, and auth validation.
3. the repo root owns workspace orchestration only.

### Canonical versions from this repo

These are the important versions visible in the current workspace and lockfile.

| Package | Declared | Resolved now | Where | Why it matters |
| --- | --- | --- | --- | --- |
| `pnpm` | `10.2.1` | `10.2.1` | root `packageManager` | workspace package manager pin |
| `turbo` | `^2.5.0` | `2.8.3` | root | monorepo task orchestration |
| `next` | `15.4.10` | `15.4.10` | root + `apps/web` | Next.js App Router runtime |
| `react` | `19.1.0` | `19.1.0` | root overrides + apps | required by Next.js and Convex React client |
| `react-dom` | `19.1.0` | `19.1.0` | root overrides + apps | required by Next.js |
| `convex` | `^1.29.1` | `1.29.3` | root + `apps/web` + `apps/backend` | backend runtime, CLI, generated API, React bindings |
| `@workos-inc/authkit-nextjs` | `^2.7.1` | `2.11.0` | `apps/web` | WorkOS auth middleware, callback handling, client hooks |
| `typescript` | `^5` / `~5.9.2` | `5.9.3` | apps | type checking |
| `vitest` | `^4.0.17` | `4.0.17` | `apps/web`, `apps/backend` | tests |
| `convex-test` | `^0.0.41` | `0.0.41` | `apps/backend` | Convex integration tests |

### Important repo-level facts

1. The root `package.json` includes `next` and `convex` as dev dependencies. This helps deployment and workspace tooling.
2. The root `pnpm` overrides lock React and React type packages to one version across apps.
3. `apps/web/next.config.ts` enables `experimental.externalDir = true`, which matters because the web app imports generated Convex code from outside `apps/web`.

## Recommended Monorepo Structure

Use this as the starter template structure.

```text
root/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
├── detailed.md
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── middleware.ts
│   │   ├── .env.local.example
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── callback/
│   │   │   │   └── route.ts
│   │   │   ├── sign-in/
│   │   │   │   └── route.ts
│   │   │   └── sign-up/
│   │   │       └── route.ts
│   │   └── components/
│   │       └── ConvexClientProvider.tsx
│   └── backend/
│       ├── package.json
│       └── convex/
│           ├── auth.config.ts
│           ├── schema.ts
│           ├── _generated/
│           └── *.ts
└── packages/
    └── shared/        # optional later, not required for the first starter
```

### Why each critical file exists

| File | Responsibility |
| --- | --- |
| `package.json` | root scripts, workspace dependency pins, top-level `next` and `convex` |
| `pnpm-workspace.yaml` | declares `apps/*` and optional `packages/*` workspaces |
| `turbo.json` | build, dev, lint, typecheck, test task definitions |
| `apps/web/middleware.ts` | protects routes with WorkOS AuthKit middleware |
| `apps/web/app/sign-in/route.ts` | redirects to the WorkOS sign-in URL |
| `apps/web/app/sign-up/route.ts` | redirects to the WorkOS sign-up URL |
| `apps/web/app/callback/route.ts` | finalizes the WorkOS auth callback and normalizes redirect behavior |
| `apps/web/components/ConvexClientProvider.tsx` | bridges AuthKit auth state and access tokens into `ConvexProviderWithAuth` |
| `apps/web/app/layout.tsx` | mounts the provider near the app root |
| `apps/backend/convex/auth.config.ts` | tells Convex how to validate WorkOS JWTs |
| `apps/backend/convex/schema.ts` | defines typed Convex tables |
| `apps/backend/convex/*.ts` | queries, mutations, and auth-checked backend logic |

## Current Repo Mapping

These are the equivalent files in this repository.

| Canonical file | Current repo path |
| --- | --- |
| root `package.json` | `package.json` |
| `pnpm-workspace.yaml` | `pnpm-workspace.yaml` |
| `turbo.json` | `turbo.json` |
| `apps/web/middleware.ts` | `apps/web/middleware.ts` |
| `apps/web/app/sign-in/route.ts` | `apps/web/app/sign-in/route.ts` |
| `apps/web/app/sign-up/route.ts` | `apps/web/app/sign-up/route.ts` |
| `apps/web/app/callback/route.ts` | `apps/web/app/callback/route.ts` |
| `apps/web/components/ConvexClientProvider.tsx` | `apps/web/components/ConvexClientProvider.tsx` |
| `apps/web/app/layout.tsx` | `apps/web/app/layout.tsx` |
| `apps/web/next.config.ts` | `apps/web/next.config.ts` |
| `apps/web/.env.local.example` | `apps/web/.env.local.example` |
| `apps/backend/convex/auth.config.ts` | `apps/backend/convex/auth.config.ts` |
| `apps/backend/convex/schema.ts` | `apps/backend/convex/schema.ts` |

The current repo also includes `apps/mobile` and a much larger feature set in both `apps/web` and `apps/backend`. Those are useful examples, but not required for the starter integration itself.

## Package Inventory

This section focuses on packages that matter to the starter integration, not every UI dependency in `apps/web`.

### Root packages

| Package | Declared | Resolved | Reason |
| --- | --- | --- | --- |
| `turbo` | `^2.5.0` | `2.8.3` | run tasks across workspaces |
| `next` | `15.4.10` | `15.4.10` | root-level framework detection and workspace consistency |
| `convex` | `^1.29.1` | `1.29.3` | CLI and dependency visibility for deployment/tooling |

### Web app packages

| Package | Declared | Resolved | Reason |
| --- | --- | --- | --- |
| `next` | `15.4.10` | `15.4.10` | web framework |
| `react` | `19.1.0` | `19.1.0` | UI runtime |
| `react-dom` | `19.1.0` | `19.1.0` | UI runtime |
| `convex` | `^1.29.1` | `1.29.3` | `ConvexReactClient`, `ConvexProviderWithAuth`, generated API imports |
| `@workos-inc/authkit-nextjs` | `^2.7.1` | `2.11.0` | middleware, sign-in/sign-up URLs, callback handling, client hooks |
| `typescript` | `^5` | `5.9.3` | type checking |
| `eslint-config-next` | `15.2.3` | `15.2.3` | Next.js linting |
| `vitest` | `^4.0.17` | `4.0.17` | tests |

### Backend packages

| Package | Declared | Resolved | Reason |
| --- | --- | --- | --- |
| `convex` | `^1.29.1` | `1.29.3` | backend runtime and Convex CLI |
| `convex-test` | `^0.0.41` | `0.0.41` | Convex integration testing |
| `typescript` | `^5` | `5.9.3` | type checking |
| `vitest` | `^4.0.17` | `4.0.17` | tests |
| `@edge-runtime/vm` | `^5.0.0` | `5.0.0` | test support for Convex runtime |

### Packages you do not need for the first starter

The current web app includes many Radix, Tiptap, and UI packages. Those are feature-layer dependencies, not part of the core Next.js + Convex + WorkOS integration. Keep them out of the initial starter unless the starter is intentionally shipping a design system too.

## Environment Variables

### Canonical minimum env contract

These are the variables the starter should treat as required.

| Variable | Scope | Used by | Required | Example | Notes |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | public | `apps/web/components/ConvexClientProvider.tsx` | yes | `https://your-deployment.convex.cloud` | browser-visible Convex deployment URL |
| `WORKOS_CLIENT_ID` | server | WorkOS AuthKit and `apps/backend/convex/auth.config.ts` | yes | `client_your_client_id` | used by both the web auth flow and Convex JWT validation |
| `WORKOS_API_KEY` | server | WorkOS AuthKit server flow | yes | `sk_test_your_api_key` | never expose in browser code |
| `WORKOS_COOKIE_PASSWORD` | server | WorkOS AuthKit session sealing | yes | `replace_with_32_plus_char_secret_value` | must be at least 32 chars |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | public-ish config | WorkOS callback routing | yes | `http://localhost:3700/callback` | use one canonical local callback URL |

### Important drift in the current repo

The current `apps/web/.env.local.example` still contains:

```env
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/callback
```

But the actual web dev script runs Next.js on port `3700`:

```json
"dev": "next dev --port 3700"
```

For the starter, standardize on:

```env
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3700/callback
```

and register that exact callback in WorkOS.

### Optional WorkOS/AuthKit variables

These are not configured directly in this repo, but AuthKit supports more cookie and API settings. Treat them as optional advanced knobs rather than part of the minimum starter:

1. `WORKOS_COOKIE_NAME`
2. `WORKOS_COOKIE_DOMAIN`
3. `WORKOS_COOKIE_MAX_AGE`
4. `WORKOS_COOKIE_SAMESITE`
5. `WORKOS_API_HOSTNAME`
6. `WORKOS_API_HTTPS`
7. `WORKOS_API_PORT`

If you plan to use those, verify against the current AuthKit documentation for the exact semantics in the version you install.

### Recommended example env file

Create `apps/web/.env.local.example` like this:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# WorkOS AuthKit
WORKOS_CLIENT_ID=client_your_client_id_here
WORKOS_API_KEY=sk_test_your_api_key_here
WORKOS_COOKIE_PASSWORD=replace_with_a_minimum_32_character_secret
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3700/callback
```

## Authentication and Data Flows

### 1. Sign-in flow

1. The user hits `/sign-in`.
2. `apps/web/app/sign-in/route.ts` calls `getSignInUrl()` from `@workos-inc/authkit-nextjs`.
3. The route redirects the browser to WorkOS.
4. WorkOS handles login and redirects back to the configured callback URI.
5. `apps/web/app/callback/route.ts` calls `handleAuth()`.
6. AuthKit stores the session and redirects the user back into the app.

Current repo code:

```ts
import { redirect } from 'next/navigation';
import { getSignInUrl } from '@workos-inc/authkit-nextjs';

export async function GET() {
  const authorizationUrl = await getSignInUrl();
  return redirect(authorizationUrl);
}
```

### 2. Sign-up flow

This is identical in shape to sign-in, but it uses `getSignUpUrl()`.

Current repo code:

```ts
import { redirect } from 'next/navigation';
import { getSignUpUrl } from '@workos-inc/authkit-nextjs';

export async function GET() {
  const authorizationUrl = await getSignUpUrl();
  return redirect(authorizationUrl);
}
```

### 3. Middleware protection flow

`apps/web/middleware.ts` is the first guardrail.

It does three things:

1. enables AuthKit middleware eagerly,
2. protects most routes by default,
3. leaves `'/','/sign-in','/sign-up'` public.

Current repo code:

```ts
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  eagerAuth: true,
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/sign-in', '/sign-up'],
  },
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

Why the matcher matters:

1. it avoids static assets and Next internals,
2. it still runs for API routes,
3. it makes sure routes using server auth helpers are actually covered.

### 4. Callback flow

The callback route is the handoff point from WorkOS back into the app.

Current repo code:

```ts
import { handleAuth } from '@workos-inc/authkit-nextjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const handler = handleAuth();

export async function GET(request: NextRequest) {
  const response = await handler(request);

  const location = response?.headers?.get('location');
  if (!location) {
    const url = new URL(request.url);
    return NextResponse.redirect(new URL('/', url.origin));
  }

  return response;
}
```

Why the extra redirect fallback exists:

1. it prevents the user from being stranded on `/callback`,
2. it guarantees a stable post-auth landing page even if AuthKit does not emit a redirect header.

### 5. React-to-Convex auth bridge

This is the most important application-level integration point.

The pattern is:

1. create one `ConvexReactClient` using `NEXT_PUBLIC_CONVEX_URL`,
2. mount `AuthKitProvider`,
3. wrap the tree with `ConvexProviderWithAuth`,
4. implement a tiny adapter that tells Convex whether the user is authenticated and how to fetch an access token.

Current repo code:

```ts
'use client';

import { ReactNode, useCallback, useState } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { AuthKitProvider, useAuth, useAccessToken } from '@workos-inc/authkit-nextjs/components';

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));

  return (
    <AuthKitProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}

function useAuthFromAuthKit() {
  const { user, loading: isLoading } = useAuth();
  const { getAccessToken, refresh } = useAccessToken();

  const isAuthenticated = !!user;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}): Promise<string | null> => {
      if (!user) return null;

      try {
        if (forceRefreshToken) return (await refresh()) ?? null;
        return (await getAccessToken()) ?? null;
      } catch (error) {
        console.error('Failed to get access token:', error);
        return null;
      }
    },
    [user, refresh, getAccessToken],
  );

  return { isLoading, isAuthenticated, fetchAccessToken };
}
```

What Convex expects from the adapter:

1. `isLoading`
2. `isAuthenticated`
3. `fetchAccessToken()`

### 6. Root provider placement

Mount the bridge near the top of the app tree.

Current repo shape in `apps/web/app/layout.tsx`:

```tsx
<ConvexClientProvider>
  {children}
</ConvexClientProvider>
```

This is enough for all client components below it to access authenticated Convex queries and mutations.

### 7. Convex JWT validation flow

The backend side lives in `apps/backend/convex/auth.config.ts`.

Current repo code:

```ts
import { AuthConfig } from 'convex/server';

const clientId = process.env.WORKOS_CLIENT_ID;

export default {
  providers: [
    {
      type: 'customJwt',
      issuer: 'https://api.workos.com/',
      algorithm: 'RS256',
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
    {
      type: 'customJwt',
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: 'RS256',
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
} satisfies AuthConfig;
```

Why there are two providers:

1. WorkOS may issue tokens under multiple issuer patterns.
2. Convex needs to recognize the issuer and the JWKS endpoint used to validate the token signature.

### 8. Convex app-level authorization flow

JWT validation is only the first layer. Your business logic should still check identity inside each query and mutation.

The repo consistently uses:

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error('Unauthorized');
}
```

and then scopes reads and writes by `identity.subject` or an equivalent user ID field.

This pattern should be non-negotiable in the starter.

## File-by-File Integration Guide

### Root `package.json`

Use a root package file like this:

```json
{
  "name": "starter-monorepo",
  "private": true,
  "packageManager": "pnpm@10.2.1",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "turbo run format"
  },
  "devDependencies": {
    "convex": "^1.29.1",
    "next": "15.4.10",
    "turbo": "^2.5.0"
  },
  "pnpm": {
    "overrides": {
      "@types/react": "19.1.0",
      "@types/react-dom": "19.1.0",
      "react": "19.1.0",
      "react-dom": "19.1.0"
    }
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `turbo.json`

```json
{
  "$schema": "https://turborepo.dev/schema.v2.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {},
    "test": {},
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "format": {}
  }
}
```

### `apps/web/package.json`

Use the starter with only the core packages first:

```json
{
  "name": "web",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3700",
    "build": "next build",
    "start": "next start -p 3700",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@workos-inc/authkit-nextjs": "^2.7.1",
    "convex": "^1.29.1",
    "next": "15.4.10",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "19.1.0",
    "@types/react-dom": "19.1.0",
    "eslint": "^9",
    "eslint-config-next": "15.2.3",
    "typescript": "^5",
    "vitest": "^4.0.17"
  }
}
```

### `apps/backend/package.json`

```json
{
  "name": "backend",
  "private": true,
  "scripts": {
    "dev": "convex dev",
    "dep": "convex deploy",
    "typecheck": "tsc --noEmit -p convex/tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "convex": "^1.29.1"
  },
  "devDependencies": {
    "@edge-runtime/vm": "^5.0.0",
    "@types/node": "^20",
    "convex-test": "^0.0.41",
    "typescript": "^5",
    "vitest": "^4.0.17"
  }
}
```

### `apps/web/next.config.ts`

Keep this when the web app imports generated backend code from outside the web directory.

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
```

### `apps/web/middleware.ts`

Use the current repo implementation almost verbatim.

### `apps/web/app/sign-in/route.ts`

Use the current repo implementation almost verbatim.

### `apps/web/app/sign-up/route.ts`

Use the current repo implementation almost verbatim.

### `apps/web/app/callback/route.ts`

Use the current repo implementation almost verbatim.

### `apps/web/components/ConvexClientProvider.tsx`

Use the current repo implementation almost verbatim.

### `apps/web/app/layout.tsx`

The full current file contains app-specific UI, fonts, and layout chrome. For the starter, the important part is provider placement:

```tsx
import { ConvexClientProvider } from '@/components/ConvexClientProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
```

### `apps/backend/convex/schema.ts`

The repo schema is much larger than the starter needs. For the starter, the important pattern is:

1. every user-owned table stores a `userId`,
2. each table has indexes that support user-scoped access,
3. schema definitions live centrally in `convex/schema.ts`.

Example starter pattern:

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
});
```

### Starter backend function pattern

```ts
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const listProjects = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query('projects')
      .withIndex('by_user', (query) => query.eq('userId', identity.subject))
      .collect();
  },
});

export const createProject = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    const now = Date.now();
    return await ctx.db.insert('projects', {
      userId: identity.subject,
      name: args.name,
      createdAt: now,
      updatedAt: now,
    });
  },
});
```

## Commands

### First-time setup

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter backend dev
pnpm --filter backend exec convex auth add workos
```

### Development

Run everything:

```bash
pnpm turbo run dev
```

Run web only:

```bash
pnpm turbo run dev --filter=web
```

Run backend only:

```bash
pnpm turbo run dev --filter=backend
```

Equivalent direct app commands:

```bash
pnpm --filter web dev
pnpm --filter backend dev
```

### Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

### Build and run web

```bash
pnpm turbo run build --filter=web
pnpm --filter web start
```

### Vercel notes

If you deploy the web app from this monorepo shape:

1. deploy from the repo root,
2. keep `next` visible at the root,
3. keep `convex` visible at the root,
4. make sure `NEXT_PUBLIC_CONVEX_URL` points at the production Convex deployment,
5. copy the WorkOS env vars into Vercel.

Recommended Vercel settings from this repo:

```text
Root Directory: /
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm turbo run build --filter=web
Output Directory: apps/web/.next
Development Command: pnpm turbo run dev --filter=web
```

## Verification Checklist

Use this checklist after you wire the starter.

### Auth routing

1. Visiting `/sign-in` redirects to WorkOS.
2. Visiting `/sign-up` redirects to WorkOS.
3. Completing auth returns to `/callback` and then lands inside the app.

### Middleware

1. Visiting a protected page while signed out triggers a redirect.
2. Visiting `/`, `/sign-in`, and `/sign-up` while signed out does not fail.
3. Static assets and Next internals are not blocked by middleware.

### Convex auth

1. An authenticated user can successfully call a protected Convex query.
2. An unauthenticated user gets a controlled empty result or unauthorized error, depending on your function design.
3. Data is scoped by `userId` and not leaked across users.

### Environment sanity

1. `NEXT_PUBLIC_WORKOS_REDIRECT_URI` exactly matches the WorkOS callback registration.
2. `WORKOS_COOKIE_PASSWORD` is at least 32 characters.
3. `NEXT_PUBLIC_CONVEX_URL` points at the intended environment.
4. `WORKOS_CLIENT_ID` is available to both the web app and the Convex auth config path.

## Pitfalls and Drift

### 1. Port mismatch

The repo README uses `http://localhost:3700/callback`, which matches the web dev script.

The current `apps/web/.env.local.example` still uses `3000`.

Do not copy that mismatch into the starter.

### 2. Declared version vs resolved version

`apps/web/package.json` declares `@workos-inc/authkit-nextjs` as `^2.7.1`, but the current lockfile resolves to `2.11.0`.

If you want reproducibility in a future starter, either:

1. keep a lockfile and rely on it, or
2. pin an exact version once you are satisfied with the integration.

### 3. External generated code

If your web app imports Convex generated code from outside `apps/web`, you need `externalDir` enabled in `next.config.ts`.

### 4. Convex auth is not enough by itself

Even with `auth.config.ts`, you still need per-function authorization checks using `ctx.auth.getUserIdentity()` and user-scoped queries.

### 5. Keep secrets out of docs and client code

Only `NEXT_PUBLIC_*` variables belong in browser-visible code. `WORKOS_API_KEY` and `WORKOS_COOKIE_PASSWORD` are server secrets.

## Suggested Minimal Starter Build Order

If you are recreating this in a fresh session, do it in this order:

1. create root workspace files: `package.json`, `pnpm-workspace.yaml`, `turbo.json`;
2. create `apps/web` and `apps/backend` package files;
3. initialize Convex in `apps/backend` and generate `convex/_generated`;
4. add `apps/backend/convex/auth.config.ts` and `schema.ts`;
5. add `apps/web/middleware.ts`, `sign-in/route.ts`, `sign-up/route.ts`, and `callback/route.ts`;
6. add `apps/web/components/ConvexClientProvider.tsx` and mount it in `apps/web/app/layout.tsx`;
7. define env vars and register the callback URI in WorkOS;
8. run local auth flow end to end;
9. only then start adding app-specific feature code.

## Current Repo Snapshot

The current repo is already beyond the starter:

1. `apps/web` has a large application surface including projects, prompts, bugs, resources, and study features.
2. `apps/backend/convex/schema.ts` contains many tables beyond a minimal starter.
3. `apps/mobile` exists but is not part of the core Next.js + Convex + WorkOS path.

That makes this repo a good source of working patterns, but the starter should stay smaller than the current product.