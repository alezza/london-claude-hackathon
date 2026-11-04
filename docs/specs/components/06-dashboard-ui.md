# 06 — Dashboard UI

Status: draft. **Main layout not yet chosen.** See [mockups](../../mockups/layout-options.html) and
[00 architecture](00-architecture.md).

## Purpose

One screen that tells the user, at a glance: *what was planned, what's done, what's happening now, what's wrong, and
how to intervene.*

## Required elements (whatever the layout)

1. **Plan diagram:** top-level map of plan items (03) with status colours (done / in progress / todo / abandoned) and
   overall progress. Items with open alerts are badged. Clicking an item filters the activity feed to it.
2. **Live activity feed:** newest-first stream of events at the current zoom level (07). Pause-scroll when the user
   scrolls up; "N new" indicator to jump back.
3. **Agent tree:** main agent and subagents, each with status, current task, last activity time.
4. **Alerts panel:** open alerts, critical first; ack / dismiss / "don't flag again"; each links to evidence events.
5. **Controls:** Steer (text + presets), Pause, Stop, Kill (05), scoped to the selected agent or whole session;
   intervention status always visible.
6. **Zoom control:** Exec · L1 · L2 · L3 · L4 (07), persistent per user, defaulted by interview (08).
7. **Session picker:** when several sessions run, switch between them; sessions with critical alerts highlighted.
8. **Connection indicator:** live / reconnecting / server down. Stale data is visibly marked stale.

## Layout candidates (decision pending)

- **A. Plan map first:** one project; diagram is the hero; feed and alerts beneath.
- **B. Mission control:** tile per running session, worst first; drill into A-style detail.
- **C. Timeline:** swimlane per agent/subagent over time; loops/stalls visible as shapes.

*(proposed)* B as the home screen when > 1 session is active, A as the session detail view, C as a tab within A.

## Interaction rules

- Critical alerts: visual highlight + optional desktop notification + optional sound (config).
- Nothing important is conveyed by colour alone (icons/labels too).
- Keyboard: `s` steer, `.` stop (with confirm), `1–5` zoom, `j/k` move through alerts.
- Light and dark themes.

## Tech *(proposed)*

React + Vite, React Flow for the plan diagram, virtualised list for the feed, WebSocket client with resume-from-id.

## Acceptance

- New event visible in feed < 500 ms p95 after hook fires.
- Feed stays responsive with 10,000 events in a session.
- Every alert and intervention reachable in ≤ 2 clicks from the home screen.
