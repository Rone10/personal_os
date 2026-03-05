# Low-Friction Project Voice Checkpoint (Web V1)

## Summary
Add a per-project, press-and-hold voice checkpoint in project detail. Flow: hold mic button, speak, release, server transcribes via AI SDK, text auto-saves as the single latest checkpoint, and you resume later from that checkpoint. If voice fails, fallback to quick text input.

## Approach (Chosen)
1. `Next API + AI SDK + Convex mutation` (chosen): lowest friction for UI, keeps secret keys server-side, keeps project auth/ownership in Convex.
2. `Convex action transcription`: viable but adds Convex action surface not currently used in repo.
3. `Browser speech API only`: lower backend effort but weaker provider flexibility and consistency.

## Scope
1. Web only.
2. All project types (`coding` and `general`).
3. Single latest checkpoint per project (no history).
4. No audio retention.
5. Raw transcript saved (no cleanup/summarization pass).
6. Button interaction only (no keyboard hotkey).

## Data + Backend Changes
1. Extend `projects` table in `apps/backend/convex/schema.ts`:
- `checkpointText?: string`
- `checkpointUpdatedAt?: number`
- `checkpointSource?: "voice" | "manual"`

2. Add Convex mutation in `apps/backend/convex/projects.ts`:
- `saveCheckpoint({ id: Id<"projects">, text: string, source: "voice" | "manual" })`
- Auth required.
- Project ownership required.
- Validation: trim text, reject empty, max length (2000 chars), patch `updatedAt`.

3. Add Convex query in `apps/backend/convex/projects.ts`:
- `getById({ id })` for direct project fetch in detail page (instead of loading all active projects).

## Web API + Transcription Layer
1. Add route: `apps/web/app/api/projects/checkpoint/transcribe/route.ts`
- `POST` multipart/form-data with `audio` file.
- Returns `{ text: string }`.
- Error codes:
- `400` missing/invalid payload.
- `413` too large.
- `500` transcription failure.

2. Add provider abstraction utility:
- `apps/web/lib/transcription/transcribeAudio.ts`
- AI SDK-based interface with env-selected provider/model.
- V1 provider implementation: OpenAI.
- Keep adapter boundary so provider swap does not affect route/UI.

3. Env variables:
- `OPENAI_API_KEY`
- `CHECKPOINT_STT_PROVIDER` (default: `openai`)
- `CHECKPOINT_STT_MODEL` (default: OpenAI transcription model)
- Update `apps/web/.env.local.example`.

## UI/UX Changes
1. Update project detail page `apps/web/app/projects/[id]/page.tsx`:
- Replace list-fetch pattern with `api.projects.getById`.
- Add header-right checkpoint panel: latest text + “Last updated …”.

2. New component:
- `apps/web/app/projects/_components/ProjectCheckpointRecorder.tsx`
- States: `idle`, `recording`, `transcribing`, `error`.
- Interaction:
- `pointerdown` starts recording.
- `pointerup` stops and submits audio.
- Auto-stop at 60 seconds.
- Prevent duplicate submits while transcribing.

3. Manual fallback + edit:
- If mic/transcription fails: show quick text input and `Save`.
- Allow inline edit of saved checkpoint text.
- Manual save uses same mutation with `source: "manual"`.

## Public Interfaces / Contracts
1. Convex API additions:
- `api.projects.getById`
- `api.projects.saveCheckpoint`

2. HTTP API addition:
- `POST /api/projects/checkpoint/transcribe`
- Request: multipart `audio`
- Response: JSON `{ text: string }`

3. Type updates:
- Project doc shape includes optional checkpoint fields in generated Convex types.

## Failure Modes and Handling
1. Mic permission denied: show immediate fallback text input.
2. Unsupported `MediaRecorder`/codec: show fallback text input.
3. Empty/very short capture: no save, show lightweight validation message.
4. Transcription/network failure: preserve retry path + fallback text input.
5. Unauthorized/ownership failure on save: show error state, do not overwrite local display.

## Tests and Validation
1. Backend integration tests in `apps/backend/convex/projects.test.ts`:
- unauthenticated save rejected.
- cross-user project save rejected.
- valid voice checkpoint persists.
- manual edit overwrites previous checkpoint.
- empty/whitespace rejected.
- length limit enforced.

2. Web unit tests:
- Add tests for transcription utility/provider selection.
- Add route tests with mocked transcriber success/failure mapping.

3. Manual acceptance scenarios:
- Hold-record-release saves checkpoint automatically.
- 60-second capture auto-stops and saves.
- Permission denied flows to manual input.
- Transcription failure flows to manual input.
- Inline edit updates timestamp/content.
- Reload project detail shows latest checkpoint reliably.

## Assumptions and Defaults
1. “Text-to-speech” request is interpreted as speech-to-text transcription.
2. Checkpoint history is out of scope for v1.
3. Audio is never persisted in Convex/file storage.
4. Provider/model changes are environment-driven, not user-facing.
5. Mobile implementation is deferred to a later phase.
