# 05 — Intervention (stop, pause, steer)

Status: draft. See [00 architecture](00-architecture.md).

## Purpose

When the user sees trouble, they want to **stop** the agent or **steer** it, from the dashboard, and to know it worked.

## Actions

| Action | Scope | Effect |
|--------|-------|--------|
| **Steer** | agent or session | free-text guidance delivered to the agent at its next checkpoint |
| **Pause** | agent or session | next tool call is blocked with "paused by operator, wait"; agent is held until resume *(see limits)* |
| **Stop** | agent or session | agent halts at next checkpoint |
| **Allow / Deny** | one held call (04) | releases or rejects a pre-emptively held tool call |
| **Kill** | session | last resort: terminate the Claude Code process |

Quick-steer presets *(proposed)*: "Stay within the plan", "Stop and explain what you're doing", "Revert your last
change and try a documented approach", "Don't add dependencies; ask me first".

## Delivery

- Interventions are queued in the server per agent. Checkpoints are `PreToolUse` and `Stop` hook calls (01).
- **Steer at `PreToolUse`:** block the pending call with the steering text as the reason, so the agent reads it and
  re-plans. **Steer at `Stop`:** block the stop with the steering text so the agent continues with the guidance.
- **Stop:** hook returns the "stop processing" output (`continue: false` with a reason) at the next checkpoint.
- **Kill:** the hook records the Claude Code process id at `SessionStart`; the server sends SIGINT, then SIGTERM after
  5 s. Requires a confirm dialog.
- Builder must verify exact hook output formats against current Claude Code docs.

## Confirmation

Each intervention has a visible lifecycle: `queued → delivered (at event X) → acknowledged (agent's next action) |
expired`. The UI shows it on the agent until resolved. The user must never be left unsure whether stop worked.

## Limits (must be shown to user, not hidden)

- Hooks only fire at tool calls and turn ends. A **stalled** agent (long model call, hung command) reaches no
  checkpoint, so Steer/Stop stay `queued`. The UI then offers **Kill**. Builder to investigate whether a hung `Bash`
  child can be interrupted more gently.
- "Pause" via repeated blocking costs tokens and may confuse the agent. *Alternative to evaluate:* pause = stop +
  saved steer to apply on resume.

## Security

- Steer text is length-limited (2,000 chars) and sent only from the authenticated local UI (10).
- Every intervention is logged with time, action, text and outcome.

## Acceptance

- Stop issued during an active session halts it at the next tool call, and the UI shows `delivered`.
- Steer text appears in the agent's context, as seen in the transcript.
- With a stalled agent, UI shows Steer/Stop as `queued` and offers Kill.
