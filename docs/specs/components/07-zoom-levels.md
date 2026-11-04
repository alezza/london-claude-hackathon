# 07 — Zoom levels

Status: draft. **Level contents are proposed; to be confirmed.** See [00 architecture](00-architecture.md).

## Purpose

One project, viewed at the depth the user needs right now: a zoom control, not separate products. Exec answers
"is it on track?"; L1–L4 go progressively deeper when something looks off.

## Levels *(proposed)*

| Level | Question it answers | Plan diagram shows | Feed shows | Language |
|-------|--------------------|--------------------|-----------|----------|
| **Exec** | Is it on track? Anything I must act on? | top-level goals only, % done, RAG status | one-line narrative updates every few minutes (09) | plain English, no file names |
| **L1** | What is it working on and why? | plan items + subagents | per plan item: started/finished, summarised activity (09) | plain, component names allowed |
| **L2** | Which parts of the system are changing? | items + affected components/directories | grouped actions: "edited 3 files in `src/api`", tests run + result | light technical |
| **L3** | Exactly which operations? | items + files | every tool call: file, command, outcome, duration | technical |
| **L4** | Show me the evidence | items + files + events | raw events: full commands, diffs, tool input/output (capped), hook payload | raw |

## Rules

- Alerts are visible at **every** level; at Exec they're phrased in plain terms ("The agent is repeatedly fixing its
  own change to the login code"), with a "show me" that jumps to L3 filtered to the evidence.
- Zooming keeps context: selected plan item / agent / time window persists across levels.
- L4 never renders agent output as HTML or Markdown that can execute or load remote content; plain text with escaping
  only (10).
- Exec and L1 summaries come from the summariser (09) and must cite the event ids they summarise (hover to see).

## Acceptance

- Switching level re-renders in < 200 ms without losing selection.
- At Exec, no file paths or commands appear except inside a "show me" expansion.
