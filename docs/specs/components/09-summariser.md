# 09 — Summariser (LLM)

Status: draft. See [00 architecture](00-architecture.md).

## Purpose

Turn streams of low-level events into short plain-language summaries for Exec and L1 (07), plain-language alert
wording (04), and drive the startup interview (08).

## Behaviour

- Runs asynchronously; never on the hook's critical path.
- Batches: summarise per plan item on status change, and every N minutes (default 3) for active items.
- Input: normalised events (00) only, with `raw` stripped and file contents excluded. Commands and paths included.
- Output: `{ text, level, cites: [event ids], generated_at }`; the UI shows citations on hover.
- Caches by (input event ids, level, style) to avoid repeat calls.

## Provider *(proposed)*

- Claude API via the official Anthropic SDK; default model `claude-sonnet-5-5` for speed and cost, configurable.
- API key from env var or OS keychain, never stored in the event DB or logs.
- **Off by default.** Enabling it is an explicit opt-in in settings, stating that event summaries are sent to the
  provider. Without it: Exec/L1 fall back to template-based summaries ("Working on *X*: 12 edits, tests failing").

## Prompt-injection posture

Event content is untrusted (files, command output, web pages the agent fetched). The summariser:

- wraps event content in clearly delimited data blocks and instructs the model to treat it as data;
- has **no tools** and no ability to trigger interventions or change settings;
- output is rendered as escaped plain text only.

## Acceptance

- With the LLM disabled, every zoom level still renders (templated summaries).
- Summaries cite at least one event id; cited ids exist and belong to the session.
- An event containing "ignore previous instructions…" text does not change summariser behaviour (fixture test).
