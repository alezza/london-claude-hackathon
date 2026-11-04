# Complex-task prompt for the live dashboard

Paste everything inside the box below into Claude Code, in an **empty folder**.
It runs about 5–10 minutes and lights up every part of the dashboard: the plan,
captions, web search and fetches, parallel sub-agents, a skill, file edits, a
review loop and sources. If Notion is connected, it also uses an MCP server.

**Before you start:** the `live-dashboard` mod must be loaded in your session
(open it with `/live`, then press Tab and use 1–4 to switch views).

---

```text
Build an "API Security Control Matrix" for our GRC team, as a small static website in this folder.

Goal: map each OWASP API Security Top 10 (2023) risk to the controls that address it in
SOC 2 (2017 Trust Services Criteria, CC series) and ISO/IEC 27001:2022 Annex A, and show
how well the matrix is covered.

Work like this:
1. Plan first. Show me a step-by-step plan before doing anything else.
2. Research: use web search to find the official OWASP API Top 10 2023 list. Fetch the
   official page for each risk. Use only primary sources (owasp.org, aicpa-cima.com, iso.org);
   if a control's wording isn't publicly available, say so instead of guessing.
3. Parallel drafting: start 3 sub-agents at the same time.
   - Agent A maps API1–API4.
   - Agent B maps API5–API7.
   - Agent C maps API8–API10.
   For each risk, an agent returns, as JSON: the risk ID and name, a one-line description,
   2–4 SOC 2 criteria IDs with a short reason each, 2–4 ISO 27001:2022 Annex A control IDs
   with a short reason each, 3 concrete technical tests an auditor could run, and the source URLs.
   The agents return data only. They do not write files.
4. If a Notion connection is available, search my Notion for pages about API security and
   add any relevant internal notes as "Internal references" on the matching risks.
   If Notion isn't available, skip this step and say so.
5. Build the site: index.html, styles.css, app.js and data.js (the merged matrix), with
   - a searchable, filterable table (by risk, framework, control ID)
   - a detail view per risk that shows the mappings, the auditor tests and the sources
   - a coverage chart showing the number of mapped controls per risk for each framework.
     Use the dataviz skill for the chart.
   - working light and dark mode, plus keyboard and screen-reader accessibility.
6. Review: start one sub-agent to review the finished site for bugs, accessibility problems,
   and any mapping that its cited sources don't support. Fix everything it finds.
7. Verify: check that data.js parses, that every risk has at least one control in each framework,
   that every source link is https, and that the JS has no syntax errors.
8. Finish with a short summary: the files created, a coverage table, the open questions
   (mappings you were unsure of), and all sources as links.

Keep the dashboard informed: update the plan as each step starts and finishes, and add a
one-line caption at each new phase.
```

---

## What to watch on the dashboard

| Step | What should appear |
| --- | --- |
| 1 Plan | Plan checklist with 8 steps, progress bar at 0/8 |
| 2 Research | `WebSearch` + several `WebFetch` steps (purple), ↗ links under Sources |
| 3 Drafting | **3 sub-agents spinning at once** in Flow, each with its own nested fetches; a pop-up as each finishes |
| 4 Notion | `MCP notion › …` steps (pink) and Notion listed under MCP servers, if connected |
| 5 Build | `Write`/`Edit` steps (green); files listed under Sources › Changed; **dataviz** under Skills |
| 6 Review | A 4th sub-agent, then a burst of fix edits |
| 7 Verify | `Bash` checks (amber); a red ✗ if anything fails |
| Throughout | Captions per phase, the status line under the prompt, and Timeline (view 3) showing it all in order |
