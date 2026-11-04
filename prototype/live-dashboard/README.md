# live-dashboard (prototype)

A working Claude Code **mod**: a live pane beside the chat that shows what Claude is doing
as it works. It was built as a quick prototype alongside the Agent Oversight Dashboard spec
in `docs/specs/`. It runs inside Claude Code itself, so there is no server, browser or hook scripts.

## What it shows

- **Header:** the current goal, Claude's latest one-line caption, a progress bar (plan-based when a plan exists), and counters.
- **Plan:** a checklist Claude posts and ticks off (`pending / running / done / failed / skipped`).
- **Activity:** a strip with one coloured cell per tool call, plus a tool-mix bar (read, search, write, shell, web, MCP, agent, skill).
- **Flow:** a tree of the main agent → sub-agents → their latest steps, with live spinners and durations.
- **Agents:** each sub-agent with its status, step count and run time. A pop-up appears when one finishes.
- **Timeline:** steps, sub-agent launches and captions in time order.
- **Sources:** files changed and read, URLs fetched (clickable), web searches, skills and MCP servers used.
- **Usage:** input, output and cache tokens across the main loop and sub-agents.
- **Status line:** a one-line summary under the prompt, visible when the pane is closed.

## How Claude feeds it

- **Passive:** hooks on `tool.call`, `agent.spawn`, `turn.start` / `turn.complete`, `skill.prompt` and `prompt.submit`.
- **Active:** the mod registers two tools Claude can call, `mcp__live-dashboard__plan` and
  `mcp__live-dashboard__narrate`. A `prompt.compose` hook adds a short instruction to the system
  prompt, so Claude uses them in every chat the mod is loaded in.
- Only a prompt the person sends while idle starts a fresh diagram. Sub-agent reports, task
  notifications and peer messages also start turns, and those continue the current task.

## Use it

```bash
claude --plugin-dir ./prototype/live-dashboard
```

Then use `/live` to open it. Press Tab to focus the pane, then:

- `1`–`4`: switch views (Overview, Flow, Timeline, Sources)
- `r`: reset

Or type `/live flow|timeline|sources|reset`.

The pane docks beside the transcript in a wide fullscreen terminal (about 110–144+ columns).
Narrower terminals show it above the prompt.

## Develop

```bash
claude plugin validate ./prototype/live-dashboard
claude plugin test ./prototype/live-dashboard
```

`.claude-plugin/types/` is written by Claude Code when it loads the mod, and is git-ignored.
`tsconfig.json` extends it, so `tsc -p` works once the mod has loaded once.

## Relation to the spec

The mod covers parts of the live-view side of the spec: the plan, what the agent is doing now,
sub-agent status, and Claude's captions.

It does **not** yet implement:

- detectors and alerts (loops, stalls, off-scope or dangerous actions)
- intervention (stop, pause, steer)
- zoom levels, the startup interview, or the LLM summariser

A mod can intercept every tool call before it runs, so alerts and stop/pause controls could be
added here directly. That is a design choice for the team, against the hooks + server architecture
in `docs/specs/components/00-architecture.md`.

## Known limits

- The coloured bars are terminal-only. Desktop and VS Code show plain characters.
- Elapsed timers animate only while work is running.
- Sources come only from tool arguments (`file_path`, `url`, `query`), not from tool results.
