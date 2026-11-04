# Observability Pane (prototype)

A Claude Code mod: a live, Process Monitor-style pane of what Claude and its subagents are doing.

- **Agents:** the main agent and each subagent it spawns, with when it started.
- **Activity table:** one row per tool call: time · agent · kind (file, process, network, agent, skill) · operation ·
  target. Running rows are yellow, finished rows green, errors and refusals red.
- **Secrets masked:** token-like strings (GitHub, Anthropic-style `sk-`, AWS, GitLab, JWTs, long hex) show as
  `<hidden>`.

It opens by itself when a session starts (beside the chat in the full-screen layout), and `/observability` opens it at
any time.

## Try it

```bash
claude --plugin-dir prototype/observability-pane
```

## Test it

```bash
claude plugin validate prototype/observability-pane
claude plugin test prototype/observability-pane
```

## Status and next steps

A prototype: tool calls and subagents only, kept in session state. Planned, following the
[design spec](../../docs/specs/2026-11-04-agent-oversight-dashboard-design.md) and the
[layout mockups](../../docs/mockups/layout-options.html):

- a live-updating local HTML page with the full Process Monitor view (filters, highlight rules, row detail, history);
- an append-only event record, so the session can be looked back on and queried;
- the agents' thinking, their decisions (who decided, why, open or settled) and the task's stage;
- the mockup's pane: plan map, swimlanes per agent, zoom levels, alerts (loops, stalls, new dependencies,
  off-plan work) and Steer / Pause / Stop controls.
