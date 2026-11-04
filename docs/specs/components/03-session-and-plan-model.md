# 03 — Session and plan model

Status: draft. See [00 architecture](00-architecture.md).

## Purpose

Turn the raw event stream into the things a human reasons about: *which agents are running, what they were asked to
do, what the plan is, how far along it is, and which activity belongs to which part of the plan.*

## Entities

- **Session:** one Claude Code session. Status: `active | idle | waiting_for_user | stalled | stopped | finished`.
- **Agent:** main agent or subagent, forming a tree. Fields: id, parent, task description (from the `Task` tool
  input), status, start/end, last activity.
- **Plan item:** a unit of intended work. Fields: id, title, status `todo | in_progress | done | abandoned`, source,
  parent item, linked agents, linked files.
- **Activity:** an event, attributed to an agent and (where possible) a plan item.

## Plan sources (in priority order)

1. **Agent todo list:** `TodoWrite` (or equivalent task-list tool) inputs. Each call replaces the list; diff against
   the previous list to update statuses and keep history (items that vanish → `abandoned`, flagged in UI).
2. **Plan file:** a markdown plan in the project (configurable glob, e.g. `docs/**/plans/*.md`), parsed for checkbox
   items. *(proposed)*
3. **Subagent tasks:** each `Task` dispatch is a plan item under the current in-progress item.
4. **Fallback:** if none of the above exist, the first user prompt becomes a single plan item and the UI shows
   "no plan declared", itself a mild alert (04).

## Attribution

Each activity is attributed to the plan item that was `in_progress` for that agent at the time; subagent activity to
its `Task` item. Activity with no attributable item, or touching files outside the item's expected area (see 04), is
marked `unattributed`. This is the basis for off-scope detection.

## Progress

- Item progress = status; parent progress = share of children done.
- Session progress = done / (total − abandoned), shown with the count of abandoned and added-mid-flight items so plan
  churn is visible, not hidden.

## Acceptance

- A recorded session with TodoWrite updates yields the same item list and statuses Claude Code showed.
- Subagents appear as children of the correct parent agent within one event.
- Removing an item from the todo list marks it `abandoned`, not deleted.
