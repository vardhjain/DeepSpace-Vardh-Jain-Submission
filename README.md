# Benchline — Repair Café Shiftboard

Benchline is a shared work queue for volunteer repair cafés. It helps a small team carry an item from intake to pickup without losing its diagnosis, parts status, or next step between volunteers.

## Working flow

- Sign in to the workshop shiftboard.
- Add an item with its reported issue, category, and best bench.
- Search and filter the queue by open work, parts, and pickup status.
- Move a repair through intake, diagnosis, parts, ready for pickup, and returned.
- Claim a case and leave parts and next-step notes for the next volunteer.
- Follow changes in the shared activity feed and leave shift notes in the team channel.
- See how many other volunteers are currently on shift.

Four clearly marked example cases seed a new room so the workflow is understandable on first visit. They are sample records, not reports from a real repair event.

## DeepSpace integrations

- **Authentication** gates the work queue and provides the volunteer identity.
- **RecordRoom** stores repair cases and an audit feed in app-owned SQLite-backed records. The app uses confirmed writes for status, ownership, and handoff updates. Members can update records; viewers are read-only.
- **Presence rooms** show how many other volunteers are on shift. Presence is ephemeral and ends when a browser disconnects.
- **Messaging** provides a shared handoff channel for the crew.

These primitives map directly to the workflow: durable case state belongs in records, crew availability belongs in presence, and cross-shift conversation belongs in messaging.

## Scope and tradeoff

The app focuses on repair intake and volunteer handoff, not running an entire repair business. Parts are recorded as free-text notes rather than synced to an inventory system; that keeps the flow usable for different repair cafés without assuming they share a catalog. I left out AI diagnosis, payments, and external integrations because they would add setup or safety risk without helping volunteers coordinate a repair.

## Deployment and verification

- Live staging app: https://benchline-repair-cafe.spacestest.com (confirm final host after deployment).
- The source is committed locally and synced to the app’s DeepSpace repository.
- npm run type-check passes with Node 24.
- npm run build passes.
- The agent verified the signed-out sign-in gate in a browser. Signed-in case writes, messaging, and two-person presence still need a human session and should be checked before portal submission.

## Local development

Requires Node 22.15+ (or 24.x / 26.x) and npm 11.6+.

Install dependencies with npm install, start the local app with npm run dev, and create a production build with npm run build.