# Agent Oversight Dashboard

Human oversight of agentic coding work at machine speed: a real-time dashboard showing what a Claude Code agent
has planned, what it is creating, and what it is doing right now, with alerts for loops, stalls, off-scope and
dangerous actions, and the ability to steer or stop it.

- Spec: [docs/specs/2026-11-04-agent-oversight-dashboard-design.md](docs/specs/2026-11-04-agent-oversight-dashboard-design.md)
- Component specs:
  - [00 Architecture and component map](docs/specs/components/00-architecture.md)
  - [01 Event capture (Claude Code hooks)](docs/specs/components/01-event-capture.md)
  - [02 Server and event store](docs/specs/components/02-server-and-event-store.md)
  - [03 Session and plan model](docs/specs/components/03-session-and-plan-model.md)
  - [04 Detectors and alerts](docs/specs/components/04-detectors-and-alerts.md)
  - [05 Intervention (stop, pause, steer)](docs/specs/components/05-intervention.md)
  - [06 Dashboard UI](docs/specs/components/06-dashboard-ui.md)
  - [07 Zoom levels](docs/specs/components/07-zoom-levels.md)
  - [08 Startup interview](docs/specs/components/08-startup-interview.md)
  - [09 Summariser (LLM)](docs/specs/components/09-summariser.md)
  - [10 Security and config](docs/specs/components/10-security-and-config.md)
  - [11 Testing](docs/specs/components/11-testing.md)
- Layout mockups (fragment, open in a browser): [docs/mockups/layout-options.html](docs/mockups/layout-options.html)

Status: spec draft. Main-screen layout and several details are still open (see the spec's Open questions).
