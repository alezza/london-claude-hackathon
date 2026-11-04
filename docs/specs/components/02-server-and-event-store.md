# 02 — Server and event store

Status: draft. See [00 architecture](00-architecture.md).

## Purpose

Single local process that ingests events, stores them, runs the model and detectors, and pushes updates to the UI.

## Interfaces

| Endpoint | Caller | Purpose |
|----------|--------|---------|
| `POST /events` | hook (01) | ingest one event; response may contain an intervention (05) |
| `GET /sessions` | UI | list sessions with status and alert counts |
| `GET /sessions/:id` | UI | session snapshot: agent tree, plan, recent events, alerts |
| `GET /sessions/:id/events?after=&limit=` | UI | paged event history |
| `POST /sessions/:id/interventions` | UI | queue stop / pause / steer (05) |
| `POST /alerts/:id/ack` | UI | acknowledge or dismiss an alert |
| `WS /live` | UI | push: new events, model changes, alerts, intervention status |
| `GET /health` | hook, UI | liveness |

All JSON, all validated with shared zod schemas; unknown fields rejected.

## Storage

SQLite, WAL mode. Tables *(proposed)*: `events`, `sessions`, `agents`, `plan_items`, `alerts`, `interventions`,
`interview_profiles`, `settings`. Events are append-only. Retention job deletes events older than the configured
period (default 30 days).

## Processing pipeline

On each event, in order and synchronously within the request, so a stop decision can be returned in the same response:

1. validate → 2. assign `id`, server `ts` → 3. persist → 4. update model (03) → 5. run detectors (04) →
6. look up pending intervention for this agent (05) → 7. respond to hook → 8. broadcast over WebSocket.

Steps 4–6 must complete in < 30 ms p95; anything slower (e.g. LLM summaries, 09) runs asynchronously after the
response.

## Timers

A 5-second tick drives stall detection (04) and heartbeats to the UI.

## Run

- `agent-oversight start` starts server + serves built UI on `127.0.0.1:<port>` (default 4317 *(proposed)*), opens
  the browser.
- Binds to loopback only; refuses non-loopback bind addresses unless an explicit config flag is set (10).

## Acceptance

- 50 events/s sustained without dropping or reordering events per session.
- Restart preserves all sessions, alerts and pending interventions.
- UI reconnecting after a drop receives everything it missed (resume from last event id).
