# Orbit Ops — Mission Control

Orbit Ops is a focused flight desk for a small deep-space mission crew. The dashboard combines shared plans with live crew coordination so each shift can see the same mission state and leave a useful handoff.

## Working product flow

- Sign in to enter the flight deck.
- Review the active mission and its live checklist.
- Complete, reopen, and add checklist items; the readiness score follows the shared checklist.
- Add another mission callsign to the persistent watchlist.
- Open a public flight-deck channel and exchange handoff notes.
- See other signed-in controllers currently on the mission console.

## DeepSpace features used

- **Records with server-side permissions** store missions, checklist items, and the audit feed in the app-owned SQLite-backed RecordRoom. Confirmed writes are used for checklist actions so the interface can report a rejected write.
- **Presence rooms** show which other controllers are active on this mission. Presence is ephemeral and disappears when the browser disconnects.
- **Messaging** provides the public flight-deck handoff channel. Signed-in members can update shared records. Anonymous visitors can read the mission board but cannot write; the channel is public to authenticated app members, not a private command channel.
- **DeepSpace authentication** gates the interactive desk, while the SDK manages identity and room connections.

I left out AI mission advice because simulated telemetry is not a safe basis for operational recommendations. Payments, file uploads, and external data connectors would add setup without improving this demo flow. Telemetry readings and mission elapsed time are clearly presented as sample dashboard values, not live spacecraft data.

## Local development

Requires Node 22.15 and npm 11.6 or newer.

```sh
npm install
npm run dev
npm run build
```

## Deployment state`r`n`r`nThe app source and local toolchain are in this folder. It has not been registered or deployed yet: DeepSpace requires a staging account credential before it can assign the app ID. After that setup is authorized, register the app, build, deploy, and verify checklist persistence and crew handoffs in two signed-in sessions.`r`n`r`n## Tradeoff and next step

The app prioritizes a complete shared mission workflow over integrating live orbital or spacecraft feeds. The mission facts and telemetry are sample values; the team records, activity, presence, and handoff messages use DeepSpace primitives. Before operational use, replace the sample telemetry with a trusted source, define who can join the app and who can change mission state, then verify the deployed app in two signed-in browser sessions.

