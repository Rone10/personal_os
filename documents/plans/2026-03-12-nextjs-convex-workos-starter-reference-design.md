# Next.js + Convex + WorkOS Starter Reference Design

## Summary
Create a hybrid reference document for a future starter template that captures the complete integration between Next.js, Convex, and WorkOS AuthKit. The reference should be prescriptive enough to rebuild the stack in a new session, while also mapping each recommendation back to the current monorepo so the source of truth remains auditable.

## Goal
Produce a single documentation artifact that explains:

1. The recommended monorepo structure for a starter template.
2. The exact integration flows for authentication and authenticated Convex access.
3. The packages, versions, environment variables, file names, hierarchy, commands, and responsibilities required to recreate the setup.
4. How the recommended template maps back to this repository's current implementation.

## Context
The current repository already implements the relevant architecture:

1. `apps/web` contains the Next.js 15 application.
2. `apps/backend` contains the Convex backend.
3. WorkOS AuthKit is wired into the web app with middleware, sign-in/sign-up routes, a callback route, and a React provider bridge into Convex.
4. Convex validates WorkOS JWTs through `apps/backend/convex/auth.config.ts`.

This makes the repo a usable source for a starter-template reference, but the future document should not merely dump current files. It should extract a clean canonical shape and then explain where the current repo differs.

## Approaches Considered

### 1. Layered Reference Manual
Start with the recommended starter-template structure, then explain the integration flows, then provide file-by-file mappings and copyable snippets.

Pros:
1. Works both as a build guide and a long-term lookup reference.
2. Supports reuse in a future session without requiring repo archaeology.
3. Keeps the recommended structure distinct from repo-specific drift.

Cons:
1. Longer than a pure setup guide.
2. Requires careful sectioning to stay readable.

### 2. Chronological Build Playbook
Document the setup in the order an engineer would build it: initialize workspace, install packages, set env vars, add auth routes, wire Convex, then deploy.

Pros:
1. Good for first-time implementation.
2. Naturally aligned with onboarding.

Cons:
1. Harder to use as a reference later.
2. Buries file ownership and architecture under sequence.

### 3. Exhaustive Inventory Document
Center the document on tables for files, env vars, packages, versions, commands, and responsibilities.

Pros:
1. High completeness.
2. Fast lookup for individual items.

Cons:
1. Risks becoming a raw dump.
2. Weak at explaining request and token flows.

## Chosen Approach
Use the layered reference manual.

The final document should combine:

1. A canonical starter-template architecture.
2. Step-by-step integration flows.
3. Copyable snippets for the critical files.
4. A repo mapping appendix for the current implementation.

This provides the highest reuse value for a future session while avoiding a shallow inventory dump.

## Document Architecture
The final reference document should be organized into three layers:

1. **Canonical starter template**
   Define the recommended file structure, package boundaries, environment contract, and ownership split.

2. **Integration flows**
   Explain sign-in, sign-up, callback handling, middleware protection, session refresh behavior, React-to-Convex token bridging, Convex JWT validation, and local/deploy command flows.

3. **Current repo mapping**
   Map each canonical concern to its equivalent file in this repository so the reference remains traceable to working code.

## Coverage Model
The final reference document should include these top-level sections:

1. **Stack snapshot**
   Package manager, workspace layout, framework versions, and rationale for the app split.

2. **Package inventory**
   Package name, version, install location, and purpose for core integration dependencies.

3. **Environment contract**
   Every required environment variable, where it is read, whether it is public or server-only, and what breaks if it is missing.

4. **Canonical file structure**
   The recommended template tree plus a current-repo mapping tree.

5. **Integration flows**
   Request-by-request walkthroughs for auth, callback handling, session propagation, Convex authenticated requests, local dev, and deploy.

6. **Copyable file templates**
   Near-complete snippets for critical files only, not every feature file in the monorepo.

7. **Commands and verification**
   Install, dev, build, lint, typecheck, deploy, and smoke-test commands plus a verification checklist.

## Technical Decisions

### Ownership Split
The canonical starter template should preserve a strict ownership model:

1. `apps/web` owns Next.js routing, middleware, callback handling, client auth state, and the React bridge into Convex.
2. `apps/backend` owns Convex schema, functions, and JWT validation.
3. The repository root owns workspace orchestration only: top-level scripts, Turbo configuration, package manager pinning, and shared dependency overrides.

### Canonical Auth Flow
The reference should define one canonical authentication path:

1. WorkOS AuthKit runs in the web app.
2. Next.js middleware protects application routes.
3. Sign-in and sign-up routes initiate WorkOS redirects.
4. The callback route completes the WorkOS flow and normalizes the final redirect.
5. The React provider layer wraps `AuthKitProvider` around `ConvexProviderWithAuth`.
6. Convex receives WorkOS access tokens through `fetchAccessToken`.
7. `apps/backend/convex/auth.config.ts` validates those JWTs using WorkOS JWKS.

### Documentation Style
The final reference must be prescriptive, not merely descriptive.

It should explicitly state:

1. Which file goes where.
2. Which package is installed at which workspace level.
3. Which env var names are canonical.
4. Which commands are run from root versus app-level paths.

It should also call out drift and footguns in the current repo when they affect reproducibility.

## Known Drift To Capture
The current repository shows at least one integration inconsistency that the future document should correct explicitly:

1. The web app runs on port `3700`, but `apps/web/.env.local.example` still references a `3000` callback URI.

The final reference should define canonical local values and note where the current repo differs.

## Validation Requirements
The final reference document should include a minimal acceptance checklist covering:

1. Middleware redirects unauthenticated users correctly.
2. Sign-in and sign-up routes redirect to WorkOS as expected.
3. The callback route lands the user on a stable application route.
4. Authenticated React clients can call protected Convex functions.
5. Unauthenticated Convex requests fail as expected.
6. Local development commands work with documented env vars and ports.
7. Production deployment preserves the same auth assumptions.

## Constraints

1. The reference should be grounded in the current repository, not generic vendor examples.
2. The document should avoid exposing any real secret values from local environment files.
3. The template guidance should remain focused on the Next.js, Convex, and WorkOS integration, while still acknowledging the wider monorepo conventions.
4. The output should be usable in a future session with minimal additional context.

## Deliverables

1. A detailed integration reference document, likely named `detailed.md`, for future starter-template work.
2. A canonical template structure and current-repo mapping.
3. Copyable snippets for the critical integration files.
4. A validated list of packages, versions, env vars, commands, and file responsibilities.

## Notes
This design document records the approved structure and scope only. It does not implement the final reference document itself.