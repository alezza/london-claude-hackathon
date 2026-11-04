# 08 — Startup interview

Status: draft. **Question set and use of results are proposed; to be confirmed.** See
[00 architecture](00-architecture.md).

## Purpose

A brief conversation at first startup, in the style of a short brainstorming chat, that gauges the user's understanding
so the dashboard pitches itself right.

## When

- First run of the app (per user profile).
- Optionally when a new project is first seen: a shorter, project-specific version. *(proposed)*
- Re-runnable from settings. Skippable at any point; skipping defaults to L1.

## Shape *(proposed)*

- 3–6 questions, one at a time, open-ended first, ≤ 3 minutes total.
- Conversational, driven by the summariser LLM (09), with a fixed rubric so results are consistent.
- Covers:
  1. The user's role and how hands-on they are with code.
  2. Familiarity with the project's languages/frameworks (detected from the project, then asked about).
  3. How they want to be interrupted: only critical, or early warnings too.
  4. What they most fear the agent doing (seeds detector emphasis and suppressions).
  5. Optional quick check: shown a short real event sequence, "what do you think the agent is doing here?"
     to calibrate claimed vs actual understanding.

## Output: user profile

```jsonc
{
  "default_zoom": "exec | L1 | L2 | L3 | L4",
  "explanation_style": "plain | mixed | technical",
  "familiar_tech": ["typescript", "postgres"],
  "alert_sensitivity": "critical_only | normal | early",
  "emphasised_detectors": ["unvetted_dependency", "hand_hacking"],
  "notes": "free text, user-visible and editable"
}
```

The profile is always shown to the user at the end ("Here's how I'll set things up"), editable, and stored locally.

## Rules

- The user's answers are data: the interview cannot change security settings, allowlists or hook installation.
- No answers leave the machine except to the configured LLM provider, and only if the user enabled it (10). Without
  an LLM, a static form version of the same questions is used.

## Acceptance

- Completes in ≤ 6 questions; skippable at every step.
- Produces a valid profile; dashboard opens at `default_zoom` afterwards.
