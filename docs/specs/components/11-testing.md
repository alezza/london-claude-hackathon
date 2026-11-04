# 11 — Testing

Status: draft. See [00 architecture](00-architecture.md).

Specs first, then tests first: each component's Acceptance section becomes failing tests before implementation.

## Layers

| Layer | Tooling *(proposed)* | Covers |
|-------|---------------------|--------|
| Unit | Vitest | schemas, command parsing, detectors, plan diffing, redaction |
| Replay | Vitest + fixtures | recorded hook-event streams replayed through server pipeline; assert model state and alerts |
| Integration | Vitest + real server | hook script → server → DB → WS, interventions round-trip, fail-open |
| UI | Playwright | layout elements present, zoom switching, steer/stop flows, XSS fixtures render as text |
| End-to-end (manual/CI-optional) | real Claude Code session in a sandbox repo | install, live session, stop and steer actually take effect |

## Fixtures

`fixtures/sessions/*.jsonl`: one hook payload per line. Required set:

- healthy session with plan (no non-info alerts: noise budget, 04)
- edit loop / fix-of-fix chain
- test-fail loop
- stall (gap in timestamps)
- unvetted dependency install (several package managers, chained commands)
- hand-hacking inside `node_modules/` and a vendored app
- destructive commands, including quoted/chained variants and near-misses (`rm -rf ./build` inside project, etc.)
- off-scope edits outside plan / project root
- subagents nested two deep
- prompt-injection text inside tool output
- secrets in command output

## Fake agent

A small script that emits realistic hook payloads on a timer (and honours intervention responses), so the UI can be
developed and demoed without running Claude Code.

## CI

Lint, typecheck, unit + replay + integration, Playwright headless, dependency audit, on every PR.
