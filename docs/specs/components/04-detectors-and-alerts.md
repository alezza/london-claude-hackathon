# 04 — Detectors and alerts

Status: draft. See [00 architecture](00-architecture.md).

## Purpose

Catch the failure modes the user named, early enough to act: **loops** (fix of a fix of a fix), **stalls**,
**off-scope work**, and **dangerous or undesirable actions** (e.g. unvalidated library downloads, hand-hacking an
off-the-shelf application instead of a documented solution).

## Alert model

`{ id, session_id, agent_id, plan_item_id?, detector, severity: info | warn | critical, title, evidence: [event ids],
created, status: open | acked | dismissed | resolved }`

- Every alert links to the events that triggered it; the user can always see *why*.
- Alerts de-duplicate: a continuing condition updates one alert (count, last seen) rather than creating many.
- Dismissing with "don't flag this again" adds a scoped suppression rule (session or project).

## Detectors (first cut; thresholds configurable)

| Detector | Trigger *(proposed defaults)* | Severity |
|----------|-------------------------------|----------|
| **Edit loop** | same file edited ≥ 5 times within 10 min by one agent | warn; critical at 10 |
| **Test-fail loop** | same test command fails ≥ 3 times in a row with edits in between | warn |
| **Fix-of-fix** | an edit to a file the same agent created/changed earlier in this session, immediately following a failure, repeated ≥ 3 times | warn |
| **Stall** | no events from an active agent for 5 min (not `waiting_for_user`) | warn; critical at 15 min |
| **Waiting on user** | `Notification` that the agent needs permission/input | info, pinned to top |
| **Off-scope** | activity `unattributed` (03), or files touched outside the project root, or plan item added mid-flight without user prompt | warn |
| **Unvetted dependency** | package install command (`npm/pnpm/yarn add|i`, `pip install`, `cargo add`, `go get`, `brew install`, `curl … \| sh`, …) or manifest/lockfile edit adding a package not on the allowlist | critical |
| **Hand-hacking** | writes inside dependency or third-party dirs (`node_modules/`, `site-packages/`, `vendor/`, `.venv/`, `/usr/`, app install dirs) or patching tools (`patch-package`, sed on installed files) | critical |
| **Destructive command** | `rm -rf`, `git push --force`, `git reset --hard`, DROP/TRUNCATE, deleting branches, chmod/chown recursive | critical |
| **Secrets exposure** | reads of `.env`, key files, credential stores; commands printing env vars | warn |
| **Network egress** | WebFetch/curl/wget to non-allowlisted hosts | info |
| **No plan** | session active > 3 min with no plan source (03) | info |

Command matching parses commands with a shell-words library, not regex on the raw string, so quoting and chaining
(`&&`, `;`, pipes) are handled.

## Pre-emptive mode

Detectors that can judge a `tool_pre` event (unvetted dependency, hand-hacking, destructive command) run **before** the
tool executes. Per detector, config chooses: `alert` (default) or `hold`. `hold` makes the hook block that call
with a reason and asks the user in the UI to allow or deny (05). *(proposed)*

## Noise budget

Target: < 1 non-info alert per 10 minutes on a normal, healthy session. Fixtures of healthy sessions (11) assert this.

## Acceptance

- Each detector has replay fixtures that trigger it and near-miss fixtures that must not.
- A `hold` detector prevents the tool call from running until the user decides.
