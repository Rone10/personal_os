# Next.js + Convex + WorkOS Detailed Reference Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a reusable `detailed.md` reference document that captures the complete Next.js, Convex, and WorkOS integration for a future starter template, including structure, packages, versions, environment variables, commands, flows, and file placement.

**Architecture:** Treat the document as a canonical starter-template reference with a repo-mapping appendix. Build it from the current monorepo's real integration points, but normalize drift into one prescriptive setup. Keep secrets out, prefer exact paths and versions, and verify each claim against repository files instead of memory.

**Tech Stack:** Markdown, pnpm workspaces, Turborepo, Next.js 15, Convex 1.29.x, WorkOS AuthKit for Next.js, TypeScript, grep-based repo verification.

---

### Task 1: Create the document shell

**Files:**
- Create: `detailed.md`
- Reference: `documents/plans/2026-03-12-nextjs-convex-workos-starter-reference-design.md`

**Step 1: Write the document header and table of contents**

Add sections for:

```md
# Next.js + Convex + WorkOS Starter Reference

## Purpose
## Canonical Stack Snapshot
## Recommended Monorepo Structure
## Package Inventory
## Environment Variables
## Authentication and Data Flows
## File-by-File Integration Guide
## Commands
## Verification Checklist
## Current Repo Mapping
## Pitfalls and Drift
```

**Step 2: Save the initial skeleton**

Run: `test -f detailed.md && echo exists || echo missing`
Expected: `exists`

**Step 3: Verify the section order matches the approved design**

Run: `rg -n "^## " detailed.md`
Expected: Top-level sections appear in the approved order.

**Step 4: Commit**

```bash
git add detailed.md
git commit -m "docs: add starter reference document shell"
```

### Task 2: Capture workspace and version inventory

**Files:**
- Modify: `detailed.md`
- Reference: `package.json`
- Reference: `pnpm-workspace.yaml`
- Reference: `apps/web/package.json`
- Reference: `apps/backend/package.json`

**Step 1: Extract the canonical workspace setup**

Document:

1. Root package manager version.
2. Root scripts.
3. Workspace globs.
4. App responsibilities for `apps/web` and `apps/backend`.

**Step 2: Add package inventory tables**

Include rows for at least:

```md
| Package | Version | Install Location | Purpose |
| --- | --- | --- | --- |
| next | 15.4.10 | root devDependency, web dependency | Next.js app runtime and framework detection |
| convex | ^1.29.1 | root devDependency, web dependency, backend dependency | backend runtime, generated API, and React client |
| @workos-inc/authkit-nextjs | current web version | apps/web | WorkOS AuthKit middleware, routes, and client hooks |
| turbo | ^2.5.0 | root devDependency | workspace orchestration |
```

**Step 3: Verify versions against source files**

Run: `rg -n '"(next|convex|@workos-inc/authkit-nextjs|turbo)"' package.json apps/web/package.json apps/backend/package.json`
Expected: Every documented version matches the repository.

**Step 4: Commit**

```bash
git add detailed.md
git commit -m "docs: add stack and package inventory"
```

### Task 3: Document the environment contract

**Files:**
- Modify: `detailed.md`
- Reference: `apps/web/.env.local.example`
- Reference: `apps/web/components/ConvexClientProvider.tsx`
- Reference: `apps/backend/convex/auth.config.ts`
- Reference: `README.md`

**Step 1: Write the required env var table**

Include columns for:

```md
| Variable | Scope | Used By | Required | Example | Notes |
```

Capture at minimum:

1. `NEXT_PUBLIC_CONVEX_URL`
2. `WORKOS_CLIENT_ID`
3. `WORKOS_API_KEY`
4. `WORKOS_COOKIE_PASSWORD`
5. `NEXT_PUBLIC_WORKOS_REDIRECT_URI`

**Step 2: Record optional WorkOS env vars separately**

Add a small subsection for optional AuthKit variables such as cookie and API host overrides, but mark them as optional and not part of the canonical minimum starter.

**Step 3: Add a drift warning**

Explicitly note that the example file currently uses a callback URI on port `3000` while the web app's `dev` script runs on port `3700`, and define one canonical local value for the future starter.

**Step 4: Verify environment usage locations**

Run: `rg -n 'NEXT_PUBLIC_CONVEX_URL|WORKOS_CLIENT_ID|WORKOS_API_KEY|WORKOS_COOKIE_PASSWORD|NEXT_PUBLIC_WORKOS_REDIRECT_URI' apps/web apps/backend README.md --glob '!**/.next/**' --glob '!**/tsconfig.tsbuildinfo'`
Expected: Each documented variable has at least one verified usage or setup mention.

**Step 5: Commit**

```bash
git add detailed.md
git commit -m "docs: add environment variable contract"
```

### Task 4: Document the canonical file structure and ownership

**Files:**
- Modify: `detailed.md`
- Reference: `apps/web`
- Reference: `apps/backend/convex`

**Step 1: Add the recommended starter tree**

Write a clean tree such as:

```text
root/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── callback/route.ts
│   │   │   ├── sign-in/route.ts
│   │   │   ├── sign-up/route.ts
│   │   │   └── layout.tsx
│   │   ├── components/ConvexClientProvider.tsx
│   │   ├── middleware.ts
│   │   └── .env.local.example
│   └── backend/
│       └── convex/
│           ├── auth.config.ts
│           ├── schema.ts
│           └── *.ts
```

**Step 2: Add a responsibility note for each critical file**

For each file, explain why it lives there and what it owns.

**Step 3: Add a current repo mapping subsection**

Map each canonical file to the equivalent path in this repo.

**Step 4: Verify file existence**

Run: `rg --files apps/web apps/backend/convex | rg 'middleware\.ts|callback/route\.ts|sign-in/route\.ts|sign-up/route\.ts|ConvexClientProvider\.tsx|auth\.config\.ts|schema\.ts'`
Expected: Every mapped critical file exists.

**Step 5: Commit**

```bash
git add detailed.md
git commit -m "docs: add canonical structure and file ownership"
```

### Task 5: Write the auth and data-flow sections

**Files:**
- Modify: `detailed.md`
- Reference: `apps/web/middleware.ts`
- Reference: `apps/web/app/sign-in/route.ts`
- Reference: `apps/web/app/sign-up/route.ts`
- Reference: `apps/web/app/callback/route.ts`
- Reference: `apps/web/components/ConvexClientProvider.tsx`
- Reference: `apps/backend/convex/auth.config.ts`

**Step 1: Document the sign-in and sign-up initiation flow**

Explain:

1. Which route triggers the redirect.
2. Which WorkOS helper is used.
3. How the callback URI participates.

**Step 2: Document middleware behavior**

Explain:

1. `authkitMiddleware` configuration.
2. Public versus protected routes.
3. Why the matcher is broad.
4. How middleware protection interacts with App Router and API routes.

**Step 3: Document callback handling**

Explain:

1. `handleAuth()` usage.
2. Why a manual redirect fallback exists.
3. What the user sees after callback completion.

**Step 4: Document the React-to-Convex bridge**

Explain:

1. `AuthKitProvider` wraps the tree.
2. `ConvexProviderWithAuth` receives a custom `useAuth` adapter.
3. `useAccessToken` provides the access token.
4. `refresh()` handles forced token refresh.

**Step 5: Document backend JWT validation**

Explain both `customJwt` providers in `apps/backend/convex/auth.config.ts`, what issuer each accepts, and how the JWKS URL is derived from `WORKOS_CLIENT_ID`.

**Step 6: Verify every flow section against source files**

Run: `rg -n 'authkitMiddleware|getSignInUrl|getSignUpUrl|handleAuth|AuthKitProvider|useAccessToken|ConvexProviderWithAuth|customJwt|jwks' apps/web apps/backend/convex --glob '!**/.next/**'`
Expected: Every flow statement in the document can be traced to a source file.

**Step 7: Commit**

```bash
git add detailed.md
git commit -m "docs: add auth and token flow documentation"
```

### Task 6: Add copyable file templates and commands

**Files:**
- Modify: `detailed.md`
- Reference: `package.json`
- Reference: `apps/web/package.json`
- Reference: `apps/backend/package.json`
- Reference: `apps/web/middleware.ts`
- Reference: `apps/web/app/callback/route.ts`
- Reference: `apps/web/components/ConvexClientProvider.tsx`
- Reference: `apps/backend/convex/auth.config.ts`
- Reference: `README.md`

**Step 1: Add curated snippets for critical files**

Include near-complete examples for:

1. root `package.json`
2. `pnpm-workspace.yaml`
3. `apps/web/package.json`
4. `apps/backend/package.json`
5. `apps/web/middleware.ts`
6. `apps/web/app/callback/route.ts`
7. `apps/web/components/ConvexClientProvider.tsx`
8. `apps/backend/convex/auth.config.ts`
9. `apps/web/.env.local.example`

Do not copy unrelated feature code.

**Step 2: Add commands by phase**

Include:

1. install
2. backend dev
3. web dev
4. full workspace dev
5. Convex auth setup
6. build
7. lint
8. typecheck
9. deploy notes

**Step 3: Verify commands against package scripts and README**

Run: `rg -n '"(dev|build|lint|typecheck|test|start)"' package.json apps/web/package.json apps/backend/package.json && rg -n 'convex auth add workos|turbo run dev|turbo run build' README.md`
Expected: Every command in the document matches an existing script or documented setup command.

**Step 4: Commit**

```bash
git add detailed.md
git commit -m "docs: add copyable templates and command guide"
```

### Task 7: Add verification checklist and sanitize the document

**Files:**
- Modify: `detailed.md`

**Step 1: Write the verification checklist**

Include checks for:

1. middleware redirect behavior
2. sign-in route redirect
3. callback completion
4. authenticated Convex query success
5. unauthenticated Convex query rejection
6. local port and redirect consistency
7. deploy prerequisites

**Step 2: Remove accidental secret leakage**

Ensure the document contains placeholders only for env values and no copied values from local environment files.

**Step 3: Run a final safety scan**

Run: `rg -n 'sk_test_|client_[A-Z0-9]|convex\.cloud|WORKOS_COOKIE_PASSWORD=' detailed.md`
Expected: No real secrets appear. Placeholder examples are acceptable only if clearly fake.

**Step 4: Run a final structure scan**

Run: `rg -n '^## |^### ' detailed.md`
Expected: The document remains navigable and sectioned according to the approved design.

**Step 5: Commit**

```bash
git add detailed.md
git commit -m "docs: finalize starter integration reference"
```

### Task 8: Final repo validation

**Files:**
- Review: `detailed.md`

**Step 1: Re-run repository validation commands**

Run: `pnpm lint`
Expected: Existing lint status is known before handoff.

**Step 2: Re-run type checking**

Run: `pnpm typecheck`
Expected: Existing typecheck status is known before handoff.

**Step 3: Review git diff for scope control**

Run: `git --no-pager diff -- detailed.md`
Expected: Only the intended documentation changes are present.

**Step 4: Commit**

```bash
git add detailed.md
git commit -m "chore: validate starter reference documentation"
```