# Proposal: the observability pane's event record (v1)

**For:** the `feature/observability-pane` mod · **Status:** proposal for discussion · **Fits:** spec 00 (shared event
envelope), 03 (plan model), 04 (detectors), 10 (security)

## Why

The pane's README plans "an append-only event record, so the session can be looked back on and queried". The same
record can feed three things if we agree its shape now:

1. **The pane itself:** history, filters and row detail.
2. **The "Ask why" explainer:** answers must cite events, and "why" answers must quote what the agent actually said.
3. **The dashboard mockup:** its "Load recorded session" button already replays this format (tested), so any
   recorded session can be demoed and tested against the alert rules.

## The file

- One JSON object per line (JSONL), **append-only**: never rewrite or delete a line.
- One file per session: `.claude/observability/<session_id>.jsonl` in the project, git-ignored. Local only.
- **Mask secrets before writing** with the pane's existing `SECRET` pattern. Nothing unmasked ever reaches disk.
- Cap sizes: `target` 200 characters, `said` 500, `input` 4 KB, `prompt` 2 KB.
- Keep 30 days by default (spec 10).
- Everything in the file is data, never instructions, to the pane, the explainer or the dashboard.

## Fields

| Field | Type | Required | What it is | Who uses it |
|---|---|---|---|---|
| `v` | `1` | yes | Format version | All readers |
| `seq` | integer | yes | 1, 2, 3… within the session | The explainer cites these as #n |
| `ts` | ISO 8601 UTC | yes | When it happened (full date, not just `HH:MM:SS`) | Timeline, stall detection |
| `session_id` | string | yes | Claude Code session id | Multi-session view |
| `agent_id` | string | yes | `"main"` or the sub-agent id | Agent tree, lanes |
| `parent_agent_id` | string or null | yes | Who started this agent (`null` for main) | Agent tree |
| `agent_type` | string | for agents | e.g. `Explore`, `test-runner` | Labels |
| `kind` | string | yes | One of the kinds below | Everything |
| `tool` | string | tool events | Exact tool name: `Bash`, `Edit`, `mcp__github__create_pull_request`, `Skill` | Detectors, labels |
| `category` | string | tool events | The pane's kind: `file`, `process`, `network`, `agent`, `skill`, `mcp`, `tool` | Pane colours, filters |
| `target` | string | tool events | The pane's short target, masked | Pane table |
| `input` | object | tool events | Masked, size-capped tool input (`file_path`, `command`, `url`, `skill`, `description`…) | Detectors, L3/L4 |
| `outcome` | string or null | tool events | `ok`, `error`, `refused`, or `null` while running | Test-fail loop, colours |
| `duration_ms` | integer | optional | How long the call took | Timeline |
| `said` | string | **important** | The agent's last visible message before this call, masked | "Why" answers |
| `prompt` | string | `prompt` events | What the person asked, masked | Plan fallback, "why" |
| `plan` | array | `plan` events | `[{title, status}]`, status `pending`, `in_progress` or `completed` | Plan map, off-scope |
| `summary` | string | optional | A sub-agent's final message, or a narration caption | Agent panel |

**Kinds:** `session_start`, `prompt`, `plan`, `tool_pre`, `tool_post`, `subagent_start`, `subagent_stop`, `stop`,
`notification`. Later: `alert` and `intervention` (Steer, Stop, Hold decisions), so the record also shows what the
person did.

## Examples

```json
{"v":1,"seq":2,"ts":"2026-11-04T12:00:03Z","session_id":"s1","agent_id":"main","parent_agent_id":null,"kind":"plan","plan":[{"title":"Reproduce the bug","status":"in_progress"},{"title":"Fix login.ts","status":"pending"}]}
{"v":1,"seq":4,"ts":"2026-11-04T12:00:30Z","session_id":"s1","agent_id":"main","parent_agent_id":null,"kind":"tool_post","tool":"Edit","category":"file","target":"src/api/login.ts","input":{"file_path":"src/api/login.ts"},"outcome":"ok","said":"The timeout is still too short, so I'll raise it to 6 seconds."}
{"v":1,"seq":14,"ts":"2026-11-04T12:02:20Z","session_id":"s1","agent_id":"main","parent_agent_id":null,"kind":"tool_pre","tool":"Bash","category":"process","target":"npm install jwt-lite","input":{"command":"npm install jwt-lite"},"said":"jwt-lite handles token expiry for us, so I'll add it."}
```

A full example session is in `fixtures/event-record-v1.jsonl`.

## From the pane's current row

The pane already holds `{id, t, agent, kind, op, target, status}`. The record is that row plus a few fields:

| Pane row | Record |
|---|---|
| `id` | keep as `id`; add `seq` |
| `t` (`HH:MM:SS`) | `ts` with the full date |
| `agent` | `agent_id`; add `parent_agent_id`, `agent_type` |
| `kind` (file, process…) | `category`; `kind` becomes the event kind (`tool_post` etc.) |
| `op` | `tool` |
| `target` | `target` (already masked), plus `input` |
| `status` (running, ok, error, refused) | `outcome` (`null`, `ok`, `error`, `refused`) |
| (none) | `said`, `plan`, `prompt`, `session_id` |

Until the record exists, the mockup can also replay the pane's current rows as they are; it treats `t` as a time on
an arbitrary day.

## Optional: make it tamper-evident

For an audit trail, each line can carry `prev_hash` and `hash` (SHA-256 of the line without `hash`), so editing or
deleting any past line breaks the chain. This is the same approach as the evidence ledger in our GRC Autopilot
prototype, and it lets an auditor rely on the record.

## Open questions

1. **Where `said` comes from.** The explainer needs the agent's message just before each tool call. If the mod's
   `tool.call` event doesn't include it, the turn events or the session transcript (`transcript_path`) may. Worth
   checking what the mod API offers.
2. **One writer or two.** The pane and the live-dashboard mod both see every tool call. One shared record (one mod
   writes, the other reads) avoids two slightly different logs.
3. **Write timing.** Write `tool_pre` when a call starts and `tool_post` when it ends, or one line at the end with
   `duration_ms`? Two lines show running calls and stalls; one line is simpler.
