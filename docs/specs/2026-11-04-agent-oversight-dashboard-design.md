# Agent Oversight Dashboard — Design

Status: draft, 2026-11-04. Main-screen layout not yet chosen (see Open questions).

## Intent

Humans can't keep up with agentic coding work at machine speed. Watching a Claude Code terminal scroll, the user
finds out too late that:

- a **subagent** is doing something out of sight;
- the agent is in a **fix-of-a-fix loop** for a bug it introduced itself;
- the agent has **stalled**;
- the agent has gone **off scope** or done something **dangerous or undesirable**, e.g. downloaded an unvalidated
  library, or "hand-hacked" an off-the-shelf application's code instead of using a documented solution.

When that happens the user wants to **steer** the agent or **stop** it, immediately.

This app is a real-time dashboard that lets one person understand what is planned, what is being created, and what is
happening right now, and intervene.

## Users

A single operator (the person running the agents). No multi-user, roles or sharing in scope.

## Goals

1. **Plan view:** a top-level diagram of the planned work, showing what's done, in progress and not started.
2. **Live activity:** real-time stream of operations: tool calls, commands run, files read/written, subagents
   started/finished.
3. **Zoom levels:** the same project viewed at **Exec** (is it on track?) and **Technical L1–L4** (increasing detail,
   down to individual operations and file diffs). A zoom control, not separate apps.
4. **Alerts** for the failure modes above: loops, stalls, off-scope work, dangerous/undesirable actions.
5. **Intervene:** steer (send guidance to the agent) and stop, from the dashboard.
6. **Startup interview:** a brief conversational interview on first startup (like a short brainstorming chat) that
   gauges the user's understanding of the project and its technology. *Assumption:* the result sets the default zoom
   level and how plainly things are explained.

## Non-goals

- Multi-user / team / exec-audience features.
- Replacing Claude Code's own UI or permission system.
- Supporting agent tools other than Claude Code (for now).
- Hosted / cloud deployment.

## Anti-goals (failure even if it "works")

- The dashboard lags the agent so badly that alerts arrive after the damage is done.
- Alerts so noisy the user stops reading them.
- Stop/steer that silently fails, or that the user can't confirm took effect.
- The dashboard itself becoming an attack surface (exposed beyond localhost, or executing content from the agent
  stream as instructions).

## Constraints

- **Vanilla and standalone:** no dependence on the user's existing personal tooling or config.
- **Local only:** server binds to localhost. Event data stays on the machine.
- Agent output, file contents and plan text are **data, never instructions** to the dashboard or the interview.
- Validate all ingested events strictly (schema, allowlisted event types, length limits).
- Specs first, then tests first.

## How it works (builder's call, proposed defaults)

These are the spec author's suggestions, not user decisions.

- **Event capture via Claude Code hooks.** A small hook script registered for `SessionStart`, `UserPromptSubmit`,
  `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop` and `Notification` POSTs each event (JSON on stdin) to the local
  dashboard server. Session/subagent IDs give the tree of who-did-what.
- **Stop / steer via the same hooks.** `PreToolUse` can block a tool call and return a reason the agent sees, which
  serves as a steering message; returning `continue: false` halts the agent. The hook asks the server for any pending
  operator instruction before allowing each tool call. Stall handling may need an additional mechanism (a stalled agent
  makes no tool calls); builder to investigate.
- **Plan source:** the agent's own todo list / plan (e.g. TodoWrite tool events, or a plan file) mapped onto the
  diagram. Off-scope = activity not attributable to a plan item.
- **Detectors (first cut):**
  - Loop: same file edited N times or same test failing N times within a window.
  - Stall: no events for T minutes while the session isn't idle/finished.
  - Dangerous: package installs (`npm i`, `pip install`, `curl | sh` …) of anything not on an allowlist; writes inside
    dependency/vendor directories (`node_modules/`, `site-packages/`, `vendor/`); writes outside the project root.
  - Off-scope: files/areas touched that no plan item mentions.
- **Stack (suggestion):** TypeScript; Node server with WebSocket push; web UI in the browser; SQLite for the event log.

## Open questions

1. **Main screen layout.** Three candidates mocked up, not yet chosen:
   - A. Plan map first (one project, diagram is the hero, live feed and alerts below);
   - B. Mission control (tile per running session, worst first, drill in);
   - C. Timeline (swimlane per agent/subagent, loops and stalls visible as shapes).
2. What exactly each of Technical L1–L4 shows.
3. What the startup interview asks, and how its result is used beyond default zoom.
4. Whether "steer" means a free-text message, preset actions, or both.
5. Detector thresholds and the dependency allowlist.
