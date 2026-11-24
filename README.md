# Benchline — Repair Café Shiftboard

Benchline is a shared work queue for volunteer repair cafés. It helps a small team carry an item from intake to pickup without losing its diagnosis, parts status, or next step between volunteers.

## Working flow

- Sign in to the workshop shiftboard.
- Add an item with its reported issue, category, and best bench.
- Search and filter the queue by open work, parts, and pickup status.
- Move a repair through intake, diagnosis, parts, ready for pickup, and returned.
- Claim a case, release it, or take it over from another volunteer (with a confirmation).
- Leave parts and next-step notes for the next volunteer. If someone else saves the same handoff while you are typing, your draft is kept and you are warned before overwriting theirs.
- Follow changes in the shared activity feed and leave shift notes in the team channel, signed with each volunteer's first name.
- See how many volunteers are currently on shift.

Four clearly marked example cases seed a new room so the workflow is understandable on first visit. They are sample records, not reports from a real repair event.

## DeepSpace integrations

- **Authentication** gates the work queue and provides the volunteer identity and role. Viewers get a read-only board; members can change it.
- **RecordRoom** stores repair cases, the activity feed, and public volunteer display names, with per-role permissions in `src/schemas/repair-schema.ts`. Status, ownership, and handoff updates use confirmed writes.
- **Server actions** seed the example queue (`src/actions/index.ts`). Seeding from the browser could only check "the queue looks empty right now", so two first visitors would both seed it. The action uses fixed record ids (an upsert), so concurrent seeds cannot duplicate cases. Because actions bypass record-level RBAC, the action checks the caller's role itself.
- **Presence rooms** show how many volunteers are on shift. Presence is ephemeral and ends when a browser disconnects.
- **Messaging** provides the shared handoff channel for the crew.

Durable case state belongs in records, crew availability belongs in presence, and cross-shift conversation belongs in messaging.

Chat names come from a small `volunteers` collection rather than the `users` collection, because `users` holds email addresses and is readable only by its owner. Each volunteer writes only their own first name.

## Scope and tradeoff

The app focuses on repair intake and volunteer handoff, not running an entire repair business. Parts are recorded as free-text notes rather than synced to an inventory system; that keeps the flow usable for different repair cafés without assuming they share a catalog. I left out AI diagnosis, payments, and external integrations because they would add setup or safety risk without helping volunteers coordinate a repair.

Handoff conflicts are detected and surfaced, not merged: the last save wins, but nobody loses unsaved text silently. Collaborative text editing (Yjs) would merge edits, but for one or two short notes per case a warning is simpler and clearer.

## Known limits and next steps

- A case update and its activity entry are two writes. The case is written first, so a failure can only lose a log line, never the change itself. Moving both into one server action would make them a single request.
- Take-over is a confirmation, not a lock; two volunteers who click within the same second both succeed, and the later one holds the case.
- The starter template's AI chat routes, API status page, and settings page remain in the codebase but are not linked from the shiftboard.

## Deployment and verification

- Live app: https://benchline.app.space (production). An earlier build ran on a DeepSpace staging URL under a different account; this app was re-registered under my own production account.
- `npm run type-check`, `npm run lint`, unit tests, and `npm run build` pass.
- `npx deepspace test run smoke`: 6/6 pass (landing, SEO tags, no auth request or socket before sign-in, signed-out panel, sign-in overlay, 404).
- `tests/shiftboard.spec.ts` runs two signed-in test users (Ana and Ben) against the real app and passes: no duplicate example cases after both load at once, a new repair syncs live, status changes sync, claim / take over / release, a handoff conflict keeps the draft and warns, chat shows the sender's name, presence shows two volunteers, and the activity feed records changes.

### How the coding agent was used

Claude Code reviewed the scaffolded project against the brief and found the bugs above (duplicate seeding race, anonymous chat names, handoff drafts overwritten by remote updates, claims with no release or takeover guard, a selected case hidden by the current filter, write controls shown to read-only viewers) and stale template tests. It implemented the fixes, delegated rewriting the smoke tests and writing the two-user spec to a subagent, and checked those results against the logs. I chose to stay on a scope I could finish, chose production over staging, approved creating the test accounts, and reviewed the diff before deploying.

## Local development

Requires Node 22.15+ (or 24.x / 26.x) and npm 11.6+.

Install dependencies with npm install, start the local app with npm run dev, and create a production build with npm run build.