# 00 — Architecture and component map

Parent: [design overview](../2026-11-04-agent-oversight-dashboard-design.md). Status: draft.

Items marked *(proposed)* are the spec author's calls, open to change. Everything else follows from the design overview.

## Components

| # | Component | Responsibility |
|---|-----------|----------------|
| 01 | [Event capture](01-event-capture.md) | Claude Code hook script: turn each hook event into a validated event and send it to the server; carry back interventions. |
| 02 | [Server and event store](02-server-and-event-store.md) | Local HTTP/WebSocket server, ingestion, persistence, fan-out to UI. |
| 03 | [Session and plan model](03-session-and-plan-model.md) | Derive sessions, subagent tree, plan items and progress from the raw event stream. |
| 04 | [Detectors and alerts](04-detectors-and-alerts.md) | Loops, stalls, off-scope, dangerous actions. |
| 05 | [Intervention](05-intervention.md) | Stop, pause, steer; delivery and confirmation. |
| 06 | [Dashboard UI](06-dashboard-ui.md) | Browser app: plan diagram, live activity, alerts, controls. |
| 07 | [Zoom levels](07-zoom-levels.md) | Exec and Technical L1–L4 views of the same data. |
| 08 | [Startup interview](08-startup-interview.md) | Brief first-run conversation that gauges the user's understanding. |
| 09 | [Summariser (LLM)](09-summariser.md) | Plain-language summaries for higher zoom levels and the interview. |
| 10 | [Security and config](10-security-and-config.md) | Trust boundaries, validation, config file, data retention. |
| 11 | [Testing](11-testing.md) | Test strategy, replay fixtures, fake agent. |

## Data flow

```
Claude Code session(s)
   │  hook events (stdin JSON)
   ▼
[01 hook script] ──POST /events──▶ [02 server] ──▶ SQLite event log
   ▲                                  │
   │ pending intervention             ├─▶ [03 model] ─▶ [04 detectors] ─▶ alerts
   └───── response to hook ◀──────────┤                                  │
                                      ├─▶ [09 summariser] (zoom/interview)│
                                      ▼                                  ▼
                               WebSocket push ──────────────▶ [06 UI + 07 zoom]
                                      ▲                                  │
                                      └────── stop / steer (05) ◀────────┘
```

## Shared event envelope

All components exchange this normalised event. The raw hook payload is kept for L4 views.

```jsonc
{
  "id": "ulid",                 // assigned by server
  "ts": "2026-11-04T12:04:11.123Z",
  "session_id": "string",       // Claude Code session id
  "agent_id": "main | <subagent id>",
  "parent_agent_id": "string | null",
  "kind": "session_start | prompt | tool_pre | tool_post | subagent_start | subagent_stop | stop | notification | heartbeat",
  "tool": "Bash | Edit | Write | Read | WebFetch | Task | TodoWrite | ... | null",
  "summary": "edit src/api/login.ts",   // short, server-generated, plain text
  "files": ["src/api/login.ts"],        // normalised, project-relative where possible
  "command": "npm test | null",
  "outcome": "ok | error | blocked | null",
  "raw": { }                            // original hook payload, size-capped
}
```

## Stack *(proposed)*

- TypeScript throughout, Node LTS.
- Server: Fastify (HTTP) + `ws` (WebSocket). SQLite via `better-sqlite3`.
- UI: React + Vite; diagram via React Flow (or ELK.js for layout).
- Validation: `zod` schemas shared between server and hook.
- Hook script: a small Node script (or a single static binary later) registered in Claude Code settings.
- Monorepo: `packages/hook`, `packages/server`, `packages/ui`, `packages/shared`.

## Non-functional targets *(proposed)*

- Event → visible in UI: < 500 ms p95 on a laptop.
- Hook overhead per tool call: < 50 ms p95 when the server is up; **never blocks the agent** if the server is down
  (fail open, see 01).
- Sustains 50 events/s across all sessions.
- Event log survives restarts; retention configurable (default 30 days).
