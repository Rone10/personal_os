# Personal OS Monorepo (Convex + Next.js + WorkOS)

This repository is now a **Turborepo monorepo** with:

- **apps/web**: Next.js 15 frontend
- **apps/backend**: Convex backend (database + functions)
- **apps/mobile**: Expo React Native app (Expo Router tabs template)

## Requirements

- **pnpm** (this repo uses the `packageManager` field in `package.json`)
- Node.js compatible with Next.js 15

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create your environment file for the web app:
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   ```

3. Configure WorkOS AuthKit (web):
   - Create a WorkOS account
   - Add `http://localhost:3700/callback` as a redirect URI
   - Update `apps/web/.env.local` with your WorkOS credentials

4. Configure Convex (backend):
   ```bash
   pnpm --filter backend dev
   ```
   Then add WorkOS auth to Convex:
   ```bash
   pnpm --filter backend exec convex auth add workos
   ```

## Development Commands

Note: use `pnpm turbo ...` or `pnpm exec turbo ...` (the `turbo` binary is not on PATH by default).

- **Run everything**:
  ```bash
  pnpm turbo run dev
  ```
- **Web only**:
  ```bash
  pnpm turbo run dev --filter=web
  ```
- **Backend only**:
  ```bash
  pnpm turbo run dev --filter=backend
  ```
- **Mobile only**:
  ```bash
  pnpm turbo run dev --filter=mobile
  ```

Mobile platform targets (from `apps/mobile`):
```bash
pnpm --filter mobile android
pnpm --filter mobile ios
pnpm --filter mobile web
```

## Production / Build Commands

- **Build everything**:
  ```bash
  pnpm turbo run build
  ```
- **Build web only**:
  ```bash
  pnpm turbo run build --filter=web
  ```
- **Start web (after build)**:
  ```bash
  pnpm --filter web start
  ```

## Old → New Command Mapping

Use this table to translate the **old single-repo commands** to the **new monorepo equivalents**.

| Old command (root) | New command (monorepo) | Notes |
| --- | --- | --- |
| `pnpm run dev` | `pnpm turbo run dev` | Runs all apps with a `dev` script |
| `next dev` | `pnpm --filter web dev` | Web only |
| `npx convex dev` | `pnpm --filter backend dev` | Backend only |
| `pnpm build` | `pnpm turbo run build` | Builds all apps |
| `pnpm start` | `pnpm --filter web start` | Start web after build |
| `pnpm lint` | `pnpm turbo run lint` | Lints all packages with `lint` |
| `tsc --noEmit` | `pnpm --filter web typecheck` | Web typecheck |
| `pnpm test` | `pnpm turbo run test` | Tests across apps |
| `pnpm test:watch` | `pnpm turbo run test:watch` | Watch mode |

If you previously used `pnpm run start` (or `pnpm run stat`), the new equivalent for the built web app is:
```bash
pnpm turbo run build --filter=web
pnpm --filter web start
```

## WorkOS AuthKit Setup

This app uses WorkOS AuthKit for authentication. Key features:

- **Redirect-based authentication**: Users are redirected to WorkOS for sign-in/sign-up
- **Session management**: Automatic token refresh and session handling
- **Middleware protection**: Routes are protected using Next.js middleware
- **Client and server hooks**: `useAuth()` for client components, `withAuth()` for server components

## Learn more

To learn more about developing your project with Convex, check out:

- The [Tour of Convex](https://docs.convex.dev/get-started) for a thorough introduction to Convex principles.
- The rest of [Convex docs](https://docs.convex.dev/) to learn about all Convex features.
- [Stack](https://stack.convex.dev/) for in-depth articles on advanced topics.

## Join the community

Join thousands of developers building full-stack apps with Convex:

- Join the [Convex Discord community](https://convex.dev/community) to get help in real-time.
- Follow [Convex on GitHub](https://github.com/get-convex/), star and contribute to the open-source implementation of Convex.
