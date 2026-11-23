# Orbit Ops — Mission Control

Orbit Ops is a focused flight desk for a small deep-space mission crew. It combines shared mission planning with live crew coordination so each shift can review the same plan and leave useful handoff notes.

## Product flow

- Sign in to enter the mission desk.
- Review the active mission and shared checklist.
- Complete, reopen, and add checklist items; the readiness score updates from the shared checks.
- Add mission callsigns to a persistent watchlist.
- Open the flight-deck channel and exchange handoff notes.
- See other signed-in controllers on the mission console.

## DeepSpace integrations

- **Authentication** gates the interactive mission desk. The SDK handles the session and sign-in overlay.
- **RecordRoom** stores missions, checklist items, and the audit trail in app-owned SQLite-backed records. Confirmed writes let the UI report rejected changes.
- **Presence rooms** show which other signed-in controllers are active. Presence is ephemeral and ends when a browser disconnects.
- **Messaging** powers the shared flight-deck handoff channel for signed-in crew members.

## Scope and tradeoff

The project prioritizes one complete shared mission workflow over a broader set of integrations. Telemetry and elapsed mission time are sample dashboard values, not live spacecraft data. I left out AI mission advice because simulated values are not a sound basis for operational recommendations. External data feeds, payments, and file uploads would add setup without improving this demo flow.

## Deployment

- Live staging app: https://orbit-ops-kepler186f.spacestest.com
- DeepSpace confirmed the edge and data plane after deployment.
- Source is committed locally and pushed to the app's DeepSpace staging repository.

## Verification

- `npm run type-check` passed with Node 24.
- `npm run build` passed.
- I opened the live landing page and verified `/home` displays the sign-in gate to signed-out visitors.
- Signed-in checklist writes, handoff messaging, and two-person live presence still need a real user session to verify. Those are the next manual checks before submitting.

## Local development

Requires Node 22.15+ (or 24.x / 26.x) and npm 11.6+.

```sh
npm install
npm run dev
npm run build
```