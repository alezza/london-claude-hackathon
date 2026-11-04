# 01 — Event capture (Claude Code hooks)

Status: draft. See [00 architecture](00-architecture.md).

## Purpose

Get every meaningful agent action out of Claude Code and into the dashboard in real time, without depending on
terminal scraping, and provide the return path for interventions (05).

## Mechanism

Claude Code hooks. One hook script, registered for these events (builder must verify names and payloads against the
current Claude Code hooks documentation; newer versions may add events such as a subagent-start event):

| Hook event | Becomes `kind` | Notes |
|------------|----------------|-------|
| `SessionStart` | `session_start` | records cwd, model, source (startup/resume) |
| `UserPromptSubmit` | `prompt` | the user's instruction; first prompt seeds the plan (03) |
| `PreToolUse` | `tool_pre` | **also the intervention checkpoint** (05) |
| `PostToolUse` | `tool_post` | outcome, error text (capped) |
| `SubagentStop` | `subagent_stop` | |
| `Stop` | `stop` | end of an agent turn; second intervention checkpoint |
| `Notification` | `notification` | e.g. agent waiting for permission or idle → feeds stall detection |

Subagent start is inferred from `PreToolUse` of the `Task`/agent tool when no native event exists.

## Behaviour

1. Read hook JSON from stdin. Reject (log locally, exit 0) if it is not valid JSON or exceeds 1 MB.
2. Build the envelope (00): extract session id, tool name, file paths, command; cap `raw` at 64 KB, truncating large
   fields (`tool_response`, file contents) with a marker.
3. POST to `http://127.0.0.1:<port>/events` with the local auth token (10). Timeout 300 ms.
4. For `tool_pre` and `stop`: the server response may carry an intervention (05). Translate it into the hook's output
   format (block with reason, or stop). Otherwise allow.
5. **Fail open:** if the server is unreachable, times out, or returns an error, exit 0 with no decision and append the
   event to a local spool file; the server drains the spool on startup. Rationale: the dashboard must never break the
   agent. *(proposed; a "fail closed" option for high-risk settings is in config, default off.)*

## Install

- `npx agent-oversight install` (or equivalent) adds the hook entries to Claude Code **user or project settings, as
  the user chooses**, showing the exact diff and asking before writing. `uninstall` reverses it exactly.
- Never edits any other settings.

## Validation

- Allowlist of hook event names; anything else ignored.
- Session ids, tool names: restricted charset `[A-Za-z0-9._:-]`, max 128 chars.
- File paths normalised with a path library; stored as given plus project-relative form; never resolved via the
  shell.

## Acceptance

- Each listed hook event produces exactly one stored event with correct `kind`, `session_id`, `agent_id`.
- With the server stopped, a Claude Code session runs normally and events appear after the server restarts.
- p95 added latency per tool call < 50 ms with server up.
