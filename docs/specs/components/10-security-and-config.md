# 10 — Security and config

Status: draft. See [00 architecture](00-architecture.md).

## Threat model (summary)

| Asset | Threat | Control |
|-------|--------|---------|
| Ability to stop/steer/kill agents | another local process or web page forges interventions | loopback bind, per-install random token, Origin check, CSRF-safe design |
| Event log (may contain code, commands, secrets) | exfiltration, over-retention | local only, file permissions 0600, retention limit, secret redaction |
| UI | XSS from agent-produced content | all content rendered as escaped text; strict CSP; no `dangerouslySetInnerHTML` |
| Summariser / interview | prompt injection via event content | see 09; no tools, data-only framing |
| Agent | dashboard breaks the agent | hook fails open (01) |
| User's Claude Code config | unwanted changes | installer shows diff, asks, reversible (01) |

## Controls

- **Network:** server binds `127.0.0.1` only. Non-loopback bind requires an explicit config flag and prints a warning.
- **Auth:** random 256-bit token generated at install, stored in the app's config dir (0600). Hook sends it as a
  header; UI receives it via a one-time launch URL then an HttpOnly, SameSite=Strict cookie. WebSocket upgrade checks
  cookie + Origin.
- **Validation:** shared zod schemas, unknown fields rejected; id charsets and lengths restricted (01); body size
  limits (1 MB); path handling via a path library, never shell.
- **Redaction:** before storage, mask values matching common secret patterns (API keys, tokens, private key blocks,
  `.env` assignments). Redaction is lossy by design. *(proposed)*
- **CSP:** `default-src 'self'`; no remote scripts, fonts or images.
- **Dependencies:** pinned lockfile; minimal dependency set; CI runs audit. (The tool should practise what it detects.)

## Config

Single file (`config.json` in the app's config dir), validated on load; invalid config → refuse to start with a clear
message.

```jsonc
{
  "port": 4317,
  "bind": "127.0.0.1",
  "retention_days": 30,
  "fail_mode": "open",                  // open | closed
  "detectors": { "edit_loop": { "threshold": 5, "window_min": 10, "mode": "alert" }, "...": {} },
  "dependency_allowlist": ["react", "zod"],
  "egress_allowlist": ["docs.anthropic.com"],
  "plan_file_globs": ["docs/**/plans/*.md"],
  "summariser": { "enabled": false, "model": "claude-sonnet-5-5" },
  "notifications": { "desktop": true, "sound": false }
}
```

## Acceptance

- Requests without the token, or with a foreign Origin, are rejected (tests for HTTP and WS).
- An event containing `<script>` renders as text at L4.
- Seeded secrets in events are masked in storage and UI.
