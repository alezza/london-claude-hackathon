import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Dashboard, Note, PlanItem, PlanStatus, Source, Status, Step, Tally, View } from '../types'

const PANE = 'live-dashboard'
const TITLE = '◆ Claude Live'
const MAIN = 'main'
const SELF = 'mcp__live-dashboard__'

const empty = (): Dashboard => ({
  goal: '',
  turnStartedAt: 0,
  mainStatus: 'done',
  agents: [],
  steps: [],
  skills: [],
  mcp: [],
  sources: [],
  notes: [],
  plan: [],
  usage: { input: 0, output: 0, cacheRead: 0, turns: 0 },
})

// Bump the shape tag whenever Dashboard's fields change.
const dash = atom({ plugin: 'live-dashboard', key: 'dash' } as const, empty(), { shape: 'dash-2' })
// Animation frame: ticks while something is running, so spinners and timers move.
const frame = atom({ plugin: 'live-dashboard', key: 'frame' } as const, 0)
const view = atom({ plugin: 'live-dashboard', key: 'view' } as const, 'overview' as View)

// ---------- what Claude is told (every chat) ----------

const GUIDE = `A live dashboard beside the chat shows the person what you are doing. Keep it informative:
- For any task with 3+ steps, call mcp__live-dashboard__plan first with short step titles, and call it again to update statuses (pending/running/done/failed/skipped) as you progress.
- Call mcp__live-dashboard__narrate with one short sentence when you start a new phase or make a notable decision or finding ("Reading the auth middleware to see where tokens are checked"). Not after every tool call; a few per task.
These tools only update the dashboard; never mention them to the person.`

// ---------- look ----------

const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const PULSE = ['◐', '◓', '◑', '◒']

type Cat = 'read' | 'search' | 'write' | 'shell' | 'web' | 'mcp' | 'agent' | 'skill' | 'other'

const CATS: { cat: Cat; label: string; hex: number }[] = [
  { cat: 'read', label: 'read', hex: 0x5b8def },
  { cat: 'search', label: 'search', hex: 0x3fb6c6 },
  { cat: 'write', label: 'write', hex: 0x4caf6a },
  { cat: 'shell', label: 'shell', hex: 0xe0a33a },
  { cat: 'web', label: 'web', hex: 0x9b6cf0 },
  { cat: 'mcp', label: 'mcp', hex: 0xe0609a },
  { cat: 'agent', label: 'agent', hex: 0xd97757 },
  { cat: 'skill', label: 'skill', hex: 0x2ec4a6 },
  { cat: 'other', label: 'other', hex: 0x8a8a85 },
]
const hexOf = (c: Cat) => CATS.find(x => x.cat === c)!.hex
const css = (n: number) => '#' + n.toString(16).padStart(6, '0')
const CLAUDE = 0xd97757
const FAIL = 0xe5484d
const DIM = 0x4a4a46
const DEFAULT = 0x01000000

const catOf = (tool: string): Cat => {
  if (tool === 'MCP' || tool.startsWith('mcp__')) return 'mcp'
  switch (tool) {
    case 'Read':
      return 'read'
    case 'Grep':
    case 'Glob':
    case 'ToolSearch':
      return 'search'
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return 'write'
    case 'Bash':
      return 'shell'
    case 'WebFetch':
    case 'WebSearch':
      return 'web'
    case 'Agent':
    case 'SendMessage':
      return 'agent'
    case 'Skill':
      return 'skill'
    default:
      return 'other'
  }
}

/** Packs Raster cells: [char, fg, bg] per cell → padded base64. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const pack = (cells: [string, number, number?][]): string => {
  const words = new Uint32Array(cells.length * 3)
  cells.forEach(([ch, fg, bg], i) => {
    words[i * 3] = ch.codePointAt(0) ?? 32
    words[i * 3 + 1] = fg
    words[i * 3 + 2] = bg ?? DEFAULT
  })
  const b = new Uint8Array(words.buffer)
  let out = ''
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i]! << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += i + 1 < b.length ? B64[(n >> 6) & 63]! : '='
    out += i + 2 < b.length ? B64[n & 63]! : '='
  }
  return out
}

// ---------- helpers ----------

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s)
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()
const base = (p: string) => p.split('/').filter(Boolean).slice(-2).join('/')
const kfmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n))
const clock = (t: number) => {
  const d = new Date(t)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':')
}

const arg = (e: object, key: string): string => {
  const v = (e as Record<string, unknown>)[key]
  return typeof v === 'string' ? v : ''
}

const bump = (list: Tally[], name: string, detail?: string): Tally[] => {
  const hit = list.find(t => t.name === name)
  if (!hit) return [...list, { name, count: 1, detail }]
  return list.map(t => {
    if (t.name !== name) return t
    const details = new Set((t.detail ?? '').split(', ').filter(Boolean))
    if (detail) details.add(detail)
    return { ...t, count: t.count + 1, detail: [...details].slice(-4).join(', ') }
  })
}

const addSource = (list: Source[], kind: Source['kind'], ref: string): Source[] => {
  if (!ref) return list
  const hit = list.find(s => s.kind === kind && s.ref === ref)
  if (hit) return list.map(s => (s === hit ? { ...s, count: s.count + 1 } : s))
  return [...list, { kind, ref, count: 1 }].slice(-80)
}

/** A short, human label for what a tool call is doing. */
const describe = (e: { tool: string } & object): string => {
  const t = e.tool
  if (t.startsWith('mcp__')) {
    const [, server = '', tool = ''] = t.split('__')
    return `${server} › ${tool}`
  }
  switch (t) {
    case 'Read':
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return base(arg(e, 'file_path') || arg(e, 'notebook_path'))
    case 'Bash':
      return arg(e, 'description') || oneLine(arg(e, 'command'))
    case 'Grep':
    case 'Glob':
      return arg(e, 'pattern')
    case 'WebFetch':
      return arg(e, 'url')
    case 'WebSearch':
      return `"${arg(e, 'query')}"`
    case 'Skill':
      return arg(e, 'skill')
    case 'ToolSearch':
      return arg(e, 'query')
    case 'Agent':
      return `${arg(e, 'subagent_type') || 'agent'}: ${arg(e, 'description')}`
    default:
      return arg(e, 'description')
  }
}

const ago = (from: number, to: number) => {
  const s = Math.max(0, Math.round((to - from) / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
}

const isBusy = (d: Dashboard) =>
  d.mainStatus === 'running' || d.agents.some(a => a.status === 'running') || d.steps.some(s => s.status === 'running')

const PLAN_STATUSES: PlanStatus[] = ['pending', 'running', 'done', 'failed', 'skipped']

// ---------- engine-side helpers (top level, as the engine requires) ----------

let stopTick: (() => void) | undefined
function startTick($: EngineInterface) {
  if (stopTick) return
  const timer = $.clock.every(150, () => {
    void (async () => {
      const d = await read($, dash)
      if (!isBusy(d)) {
        stopTick?.()
        stopTick = undefined
        await update($, frame, n => n + 1) // one last redraw, settled
        return
      }
      await update($, frame, n => (n + 1) % 10_000)
    })()
  })
  stopTick = () => timer.cancel()
}

/** One status-line summary, visible even when the pane is hidden. */
async function refreshStatus($: EngineInterface) {
  const d = await read($, dash)
  if (!isBusy(d)) return $.ui.status(undefined)
  const doneP = d.plan.filter(p => p.status === 'done').length
  const run = d.agents.filter(a => a.status === 'running').length
  const parts = [
    d.plan.length ? `plan ${doneP}/${d.plan.length}` : `${d.steps.length} steps`,
    run ? `${run} agent${run > 1 ? 's' : ''}` : '',
    d.notes.at(-1)?.text ?? '',
  ].filter(Boolean)
  $.ui.status(clip('◆ ' + parts.join(' · '), 80))
}

// ---------- module ----------

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'live',
      description: 'Open the live dashboard ("reset" clears it; overview|flow|timeline|sources picks a view)',
    })
    await $.tool.register({
      name: 'narrate',
      description:
        'Post one short sentence to the live dashboard explaining what you are doing now or what you just found. Use at phase changes and notable decisions, a few times per task. Display only.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'One short sentence, present tense.' },
          phase: { type: 'string', description: 'Optional short phase name, e.g. "Research".' },
        },
        required: ['text'],
      },
      isDeferred: false,
    })
    await $.tool.register({
      name: 'plan',
      description:
        'Set or update the task checklist shown on the live dashboard. Send the whole list each time, with each step status. Use for tasks with 3+ steps. Display only.',
      inputSchema: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                status: { type: 'string', enum: PLAN_STATUSES },
              },
              required: ['title', 'status'],
            },
          },
        },
        required: ['steps'],
      },
      isDeferred: false,
    })
    void $.ui.open({ id: PANE, title: TITLE })
    if (isBusy(await read($, dash))) startTick($)
    return next(e)
  })

  // Tell Claude, in every chat, how to keep the dashboard informative.
  on('prompt.compose', async ($, e, next) => {
    const res = await next(e)
    if (!e.tools.some(t => t.startsWith(SELF))) return res
    return { sections: [...res.sections, { id: 'live-dashboard:guide', text: GUIDE, scope: 'session' as const }] }
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'live' }, async ($, e) => {
    const a = arg(e, 'args').trim()
    if (a === 'reset') {
      await update($, dash, () => empty())
      return { text: 'Dashboard cleared.' }
    }
    if (a === 'overview' || a === 'flow' || a === 'timeline' || a === 'sources') await update($, view, () => a)
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Live dashboard opened.' }
  }).catch(() => ({ text: 'Live dashboard command failed.' }))

  // Only a prompt the person sent while idle starts a fresh diagram. Sub-agent
  // reports, task notifications and peer messages also start main-loop turns;
  // those continue the current task and must not wipe it.
  let pendingGoal: string | undefined
  const PERSON = ['composer', 'bridge', 'sdk', 'scheduled-trigger']
  on('prompt.submit', async ($, e, next) => {
    if (!e.command && !e.turnId && PERSON.includes(e.origin.kind)) pendingGoal = e.text
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      const goal = pendingGoal
      pendingGoal = undefined
      await update(
        $,
        dash,
        (d): Dashboard =>
          goal === undefined
            ? { ...d, mainStatus: 'running', turnStartedAt: d.turnStartedAt || Date.now() }
            : {
                ...d,
                goal: oneLine(goal),
                turnStartedAt: Date.now(),
                mainStatus: 'running',
                plan: [],
                notes: [],
                agents: d.agents.filter(a => a.status === 'running'),
                steps: d.steps.filter(s => d.agents.some(a => a.id === s.agent && a.status === 'running')),
              },
      )
      startTick($)
      await refreshStatus($)
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const status: Status = e.isAborted ? 'failed' : 'done'
    const u = e.usage
    let finished: string | undefined
    await update($, dash, (d): Dashboard => {
      const usage = u
        ? {
            input: d.usage.input + u.input_tokens + u.cache_creation_input_tokens,
            output: d.usage.output + u.output_tokens,
            cacheRead: d.usage.cacheRead + u.cache_read_input_tokens,
            turns: d.usage.turns + 1,
          }
        : d.usage
      if (e.agentId === undefined) return { ...d, mainStatus: status, usage }
      const a = d.agents.find(x => x.id === e.agentId)
      if (a && a.status === 'running') finished = `${a.type}: ${a.label}`
      return {
        ...d,
        usage,
        agents: d.agents.map(x => (x.id === e.agentId ? { ...x, status, endedAt: Date.now() } : x)),
      }
    })
    if (finished) $.ui.toast(`${status === 'done' ? '✓' : '✗'} ${clip(finished, 60)}`)
    await refreshStatus($)
    return next(e)
  })

  // Sub-agents: record them as they start, with who spawned them.
  on('agent.spawn', async ($, e, next) => {
    const res = await next(e)
    const id = 'agentId' in res ? res.agentId : undefined
    if (id) {
      await update($, dash, d => ({
        ...d,
        agents: [
          ...d.agents.filter(a => a.id !== id),
          {
            id,
            parent: e.parentAgentId ?? MAIN,
            label: oneLine(e.description || e.name || e.prompt),
            type: e.subagentType || 'agent',
            status: 'running' as const,
            startedAt: Date.now(),
          },
        ].slice(-40),
      }))
      startTick($)
      await refreshStatus($)
    }
    return res
  }).catch(($, e, next) => next(e))

  // Skills however they start: typed as a slash command or called by Claude.
  const prompted = new Set<string>()
  on('skill.prompt', async ($, e, next) => {
    prompted.add(e.skill)
    await update($, dash, d => ({ ...d, skills: bump(d.skills, e.skill) }))
    return next(e)
  }).catch(($, e, next) => next(e))

  // Claude's own dashboard tools.
  on('tool.call', { tool: 'mcp__live-dashboard__narrate' }, async ($, e) => {
    const text = oneLine(arg(e, 'text'))
    const phase = oneLine(arg(e, 'phase')) || undefined
    if (text) {
      const note: Note = { at: Date.now(), text, phase, agent: e.agentId ?? MAIN }
      await update($, dash, d => ({ ...d, notes: [...d.notes, note].slice(-60) }))
      await refreshStatus($)
    }
    return { result: 'Shown on the dashboard.' }
  }).catch(() => ({ result: 'Dashboard unavailable; carry on.' }))

  on('tool.call', { tool: 'mcp__live-dashboard__plan' }, async ($, e) => {
    const raw = (e as unknown as { steps?: unknown }).steps
    const plan: PlanItem[] = (Array.isArray(raw) ? raw : [])
      .map(x => x as { title?: unknown; status?: unknown })
      .filter(x => typeof x.title === 'string')
      .map(x => ({
        title: oneLine(x.title as string),
        status: PLAN_STATUSES.includes(x.status as PlanStatus) ? (x.status as PlanStatus) : 'pending',
      }))
      .slice(0, 20)
    await update($, dash, d => ({ ...d, plan }))
    await refreshStatus($)
    return { result: `Plan shown (${plan.length} steps).` }
  }).catch(() => ({ result: 'Dashboard unavailable; carry on.' }))

  // Every other tool call: a step in the diagram, plus MCP / sources.
  on('tool.call', async ($, e, next) => {
    if (e.tool.startsWith(SELF)) return next(e)
    const isSpawn = e.tool === 'Agent'
    const step: Step = {
      id: e.tool_use_id,
      agent: e.agentId ?? MAIN,
      tool: e.tool.startsWith('mcp__') ? 'MCP' : e.tool,
      label: describe(e),
      status: 'running',
      at: Date.now(),
    }

    await update($, dash, d => {
      let { mcp, sources } = d
      if (e.tool.startsWith('mcp__')) {
        const [, server = '?', tool = '?'] = e.tool.split('__')
        mcp = bump(mcp, server, tool)
      }
      if (e.tool === 'Read') sources = addSource(sources, 'file', arg(e, 'file_path'))
      if (e.tool === 'Edit' || e.tool === 'Write') sources = addSource(sources, 'edit', arg(e, 'file_path'))
      if (e.tool === 'WebFetch') sources = addSource(sources, 'url', arg(e, 'url'))
      if (e.tool === 'WebSearch') sources = addSource(sources, 'search', arg(e, 'query'))
      if (e.tool.startsWith('mcp__') && arg(e, 'url')) sources = addSource(sources, 'url', arg(e, 'url'))
      const steps = isSpawn ? d.steps : [...d.steps, step].slice(-200)
      return { ...d, mcp, sources, steps }
    })
    startTick($)

    const skill = e.tool === 'Skill' ? arg(e, 'skill') : ''
    if (skill) prompted.delete(skill)
    const ran = await next(e)
    if (skill && !prompted.has(skill)) await update($, dash, d => ({ ...d, skills: bump(d.skills, skill) }))
    const status: Status = ran.deny !== undefined || ran.isError === true ? 'failed' : 'done'
    await update($, dash, d => ({
      ...d,
      steps: d.steps.map(s => (s.id === step.id ? { ...s, status, endedAt: Date.now() } : s)),
    }))
    return ran
  }).catch(($, e, next) => next(e))

  // ---------- drawing ----------

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Link, Button } = ui
    const R = 'Raster' in ui ? ui.Raster : undefined
    const bar = (key: string, cells: [string, number][]) =>
      R ? <R key={key} columns={cells.length} rows={1} cells={pack(cells)} /> : <Text>{cells.map(c => c[0]).join('')}</Text>

    const d = await read($, dash)
    const tick = await read($, frame)
    const current = await read($, view)
    const now = Date.now()
    const busy = isBusy(d)
    const width = Math.max(32, (e.props as { bodyColumns?: number }).bodyColumns ?? 60)
    const inner = width - 4
    const spin = SPIN[tick % SPIN.length]!

    const mark = (s: Status | PlanStatus) =>
      s === 'running'
        ? { ch: spin, color: 'warning' }
        : s === 'done'
          ? { ch: '✓', color: 'success' }
          : s === 'failed'
            ? { ch: '✗', color: 'error' }
            : s === 'skipped'
              ? { ch: '⊘', color: 'subtle' }
              : { ch: '○', color: 'subtle' }

    const Card = ({ title, extra, children }: { title: string; extra?: string; children?: unknown }) => (
      <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1} marginTop={1}>
        <Box justifyContent="space-between">
          <Text bold color="claude">
            {title}
          </Text>
          {extra ? <Text dimColor>{extra}</Text> : null}
        </Box>
        {children as never}
      </Box>
    )

    // ----- numbers -----
    const total = d.steps.length
    const doneSteps = d.steps.filter(s => s.status === 'done').length
    const failedSteps = d.steps.filter(s => s.status === 'failed').length
    const runningAgents = d.agents.filter(a => a.status === 'running').length
    const planDone = d.plan.filter(p => p.status === 'done' || p.status === 'skipped').length
    const planFailed = d.plan.filter(p => p.status === 'failed').length
    const hero = mark(d.mainStatus)
    const pulse = busy ? PULSE[Math.floor(tick / 3) % PULSE.length]! : '◆'
    const caption = d.notes.at(-1)

    // progress: the plan when there is one, else finished steps
    const pTotal = d.plan.length || total
    const pDone = d.plan.length ? planDone : doneSteps
    const pFail = d.plan.length ? planFailed : failedSteps
    const barW = Math.max(8, inner - 10)
    const filled = pTotal ? Math.round((pDone / pTotal) * barW) : 0
    const failW = pTotal ? Math.round((pFail / pTotal) * barW) : 0
    const rest = Math.max(1, barW - filled - failW)
    const progress = Array.from({ length: barW }, (_, i): [string, number] =>
      i < filled
        ? ['█', CLAUDE]
        : i < filled + failW
          ? ['█', FAIL]
          : busy && i === filled + failW + (tick % rest)
            ? ['▓', CLAUDE]
            : ['░', 0x6b6b66],
    )

    // activity strip: one cell per step, coloured by kind
    const stripW = Math.max(8, inner)
    const recent = d.steps.slice(-stripW)
    const strip = Array.from({ length: stripW }, (_, i): [string, number] => {
      const s = recent[i - (stripW - recent.length)]
      if (!s) return ['·', DIM]
      if (s.status === 'failed') return ['█', FAIL]
      if (s.status === 'running') return [tick % 2 ? '▓' : '▒', hexOf(catOf(s.tool))]
      return ['█', hexOf(catOf(s.tool))]
    })

    // tool mix
    const counts = CATS.map(c => ({ ...c, n: d.steps.filter(s => catOf(s.tool) === c.cat).length })).filter(c => c.n > 0)
    const mixCells: [string, number][] = []
    counts.forEach(c => {
      const w = Math.max(1, Math.round((c.n / Math.max(1, total)) * stripW))
      for (let i = 0; i < w && mixCells.length < stripW; i++) mixCells.push(['█', c.hex])
    })
    while (mixCells.length < stripW) mixCells.push(mixCells.length ? ['█', mixCells.at(-1)![1]] : ['░', DIM])

    // ----- tabs -----
    const TABS: { id: View; label: string; key: string }[] = [
      { id: 'overview', label: 'Overview', key: '1' },
      { id: 'flow', label: 'Flow', key: '2' },
      { id: 'timeline', label: 'Timeline', key: '3' },
      { id: 'sources', label: 'Sources', key: '4' },
    ]
    const tabs = (
      <Box columnGap={1} flexWrap="wrap">
        {TABS.map(t => (
          <Button
            key={`tab-${t.id}`}
            label={t.label}
            hotkey={t.key}
            plain
            variant={t.id === current ? 'primary' : 'secondary'}
            dimColor={t.id !== current}
            onPress={() => void update($, view, () => t.id)}
          />
        ))}
        <Button key="reset" label="Reset" hotkey="r" plain dimColor onPress={() => void update($, dash, () => empty())} />
      </Box>
    )

    // ----- hero (every view) -----
    const heroCard = (
      <Box flexDirection="column" borderStyle="round" borderColor="claude" paddingX={1}>
        <Box justifyContent="space-between">
          <Text bold color="claude">
            {pulse} CLAUDE LIVE
          </Text>
          <Text color={hero.color}>
            {hero.ch} {d.mainStatus === 'running' ? 'working' : d.mainStatus === 'failed' ? 'stopped' : 'idle'}
            {d.turnStartedAt > 0 ? <Text dimColor> · {ago(d.turnStartedAt, now)}</Text> : null}
          </Text>
        </Box>
        <Text bold>{d.goal ? `“${clip(d.goal, inner * 2 - 2)}”` : 'Waiting for a prompt…'}</Text>
        {caption ? (
          <Text>
            <Text color="claude">▸ </Text>
            {caption.phase ? <Text bold>{caption.phase}: </Text> : null}
            <Text italic>{clip(caption.text, inner * 2)}</Text>
          </Text>
        ) : null}
        <Box marginTop={1}>
          {bar('progress', progress)}
          <Text dimColor>
            {' '}
            {pDone}/{pTotal}
          </Text>
        </Box>
        <Box flexWrap="wrap" columnGap={2}>
          {[
            { icon: '⚙', n: total, label: 'steps', hex: hexOf('read') },
            { icon: '◆', n: d.agents.length, label: 'agents', hex: hexOf('agent') },
            { icon: '✦', n: d.skills.length, label: 'skills', hex: hexOf('skill') },
            { icon: '⇄', n: d.mcp.length, label: 'mcp', hex: hexOf('mcp') },
            { icon: '❖', n: d.sources.length, label: 'sources', hex: hexOf('web') },
          ].map(c => (
            <Text>
              <Text color={css(c.hex)}>{c.icon}</Text>
              <Text bold> {c.n}</Text>
              <Text dimColor> {c.label}</Text>
            </Text>
          ))}
        </Box>
      </Box>
    )

    // ----- pieces -----
    const planCard =
      d.plan.length > 0 ? (
        <Card title="Plan" extra={`${planDone}/${d.plan.length}`}>
          {d.plan.map((p, i) => {
            const m = mark(p.status)
            return (
              <Text>
                <Text color={m.color}>{m.ch} </Text>
                <Text dimColor>{i + 1}. </Text>
                <Text
                  bold={p.status === 'running'}
                  dimColor={p.status === 'done' || p.status === 'skipped'}
                  strikethrough={p.status === 'skipped'}
                >
                  {clip(p.title, inner - 6)}
                </Text>
              </Text>
            )
          })}
        </Card>
      ) : null

    const activityCard = (
      <Card title="Activity" extra={busy ? `${spin} live` : 'last steps'}>
        {bar('strip', strip)}
        {bar('mix', mixCells)}
        <Box flexWrap="wrap" columnGap={2}>
          {counts.length === 0 && <Text dimColor>no tool calls yet</Text>}
          {counts.map(c => (
            <Text>
              <Text color={css(c.hex)}>■</Text>
              <Text dimColor>
                {' '}
                {c.label} {c.n}
              </Text>
            </Text>
          ))}
        </Box>
      </Card>
    )

    const agentsCard = (
      <Card title="Agents" extra={`${runningAgents} running · ${d.agents.length} total`}>
        <Text>
          <Text color={hero.color}>{hero.ch}</Text>
          <Text> main</Text>
          <Text dimColor> {d.mainStatus}</Text>
        </Text>
        {d.agents.map(a => {
          const m = mark(a.status)
          const t = ago(a.startedAt, a.endedAt ?? now)
          const n = d.steps.filter(s => s.agent === a.id).length
          return (
            <Box justifyContent="space-between">
              <Text>
                <Text color={m.color}>{m.ch} </Text>
                <Text bold color={css(hexOf('agent'))}>
                  {a.type}
                </Text>
                <Text> {clip(a.label, Math.max(6, inner - a.type.length - t.length - 12))}</Text>
              </Text>
              <Text dimColor>
                {n} steps · {t}
              </Text>
            </Box>
          )
        })}
      </Card>
    )

    const usageCard =
      d.usage.turns > 0 ? (
        <Card title="Usage" extra={`${d.usage.turns} turns`}>
          <Box flexWrap="wrap" columnGap={2}>
            <Text>
              <Text dimColor>in </Text>
              <Text bold>{kfmt(d.usage.input)}</Text>
            </Text>
            <Text>
              <Text dimColor>out </Text>
              <Text bold>{kfmt(d.usage.output)}</Text>
            </Text>
            <Text>
              <Text dimColor>cache </Text>
              <Text bold>{kfmt(d.usage.cacheRead)}</Text>
            </Text>
          </Box>
        </Card>
      ) : null

    // flow tree
    const PER_NODE = current === 'flow' ? 12 : 4
    type Line = { prefix: string; ch: string; chColor: string; tool?: string; toolColor?: string; text: string; dim?: boolean; dur?: string }
    const lines: Line[] = []
    const walk = (node: string, indent: string) => {
      const steps = d.steps.filter(s => s.agent === node)
      const kids = d.agents.filter(a => a.parent === node)
      const hidden = Math.max(0, steps.length - PER_NODE)
      const items: ({ kind: 'more' } | { kind: 'step'; s: Step } | { kind: 'agent'; id: string })[] = [
        ...(hidden ? [{ kind: 'more' as const }] : []),
        ...steps.slice(-PER_NODE).map(s => ({ kind: 'step' as const, s })),
        ...kids.map(a => ({ kind: 'agent' as const, id: a.id })),
      ]
      items.forEach((it, i) => {
        const last = i === items.length - 1
        const prefix = indent + (last ? '╰─ ' : '├─ ')
        if (it.kind === 'more') {
          lines.push({ prefix, ch: '⋯', chColor: 'subtle', text: `${hidden} earlier`, dim: true })
        } else if (it.kind === 'step') {
          const s = it.s
          const m = mark(s.status)
          lines.push({
            prefix,
            ch: m.ch,
            chColor: m.color,
            tool: s.tool,
            toolColor: css(hexOf(catOf(s.tool))),
            text: s.label,
            dim: s.status === 'done',
            dur: current === 'flow' ? ago(s.at, s.endedAt ?? now) : undefined,
          })
        } else {
          const a = d.agents.find(x => x.id === it.id)!
          const m = mark(a.status)
          lines.push({ prefix, ch: m.ch, chColor: m.color, tool: `◆ ${a.type}`, toolColor: css(hexOf('agent')), text: a.label })
          walk(a.id, indent + (last ? '   ' : '│  '))
        }
      })
    }
    walk(MAIN, '')

    const flowCard = (
      <Card title="Flow" extra={runningAgents ? `${runningAgents} agent${runningAgents > 1 ? 's' : ''} running` : undefined}>
        <Text>
          <Text color={hero.color}>{hero.ch}</Text>
          <Text bold color="claude">
            {' '}
            ◆ Claude
          </Text>
          <Text dimColor> main</Text>
        </Text>
        {lines.length === 0 && <Text dimColor>╰─ nothing yet</Text>}
        {lines.map(l => {
          const room = inner - l.prefix.length - 2 - (l.tool ? l.tool.length + 1 : 0) - (l.dur ? l.dur.length + 1 : 0)
          return (
            <Box justifyContent="space-between">
              <Text>
                <Text color="subtle">{l.prefix}</Text>
                <Text color={l.chColor}>{l.ch} </Text>
                {l.tool ? (
                  <Text bold color={l.toolColor}>
                    {l.tool}{' '}
                  </Text>
                ) : null}
                <Text dimColor={l.dim}>{clip(l.text, Math.max(6, room))}</Text>
              </Text>
              {l.dur ? <Text dimColor>{l.dur}</Text> : null}
            </Box>
          )
        })}
      </Card>
    )

    // timeline: steps, agents and narration in time order
    type Ev = { at: number; ch: string; color: string; head: string; headColor: string; text: string; italic?: boolean }
    const events: Ev[] = [
      ...d.steps.map(s => {
        const m = mark(s.status)
        const who = s.agent === MAIN ? '' : `${d.agents.find(a => a.id === s.agent)?.type ?? 'agent'} › `
        return { at: s.at, ch: m.ch, color: m.color, head: who + s.tool, headColor: css(hexOf(catOf(s.tool))), text: s.label }
      }),
      ...d.agents.map(a => ({ at: a.startedAt, ch: '◆', color: css(hexOf('agent')), head: `spawn ${a.type}`, headColor: css(hexOf('agent')), text: a.label })),
      ...d.notes.map(n => ({ at: n.at, ch: '▸', color: 'claude', head: n.phase ?? 'note', headColor: 'claude', text: n.text, italic: true })),
    ].sort((a, b) => a.at - b.at)
    const room = Math.max(6, (e.viewport?.rows ?? 40) - 14)
    const timelineCard = (
      <Card title="Timeline" extra={`${events.length} events`}>
        {events.length === 0 && <Text dimColor>nothing yet</Text>}
        {events.length > room && <Text dimColor>⋯ {events.length - room} earlier</Text>}
        {events.slice(-room).map(ev => (
          <Text>
            <Text dimColor>{clock(ev.at)} </Text>
            <Text color={ev.color}>{ev.ch} </Text>
            <Text bold color={ev.headColor}>
              {ev.head}{' '}
            </Text>
            <Text italic={ev.italic}>{clip(ev.text, Math.max(6, inner - 12 - ev.head.length))}</Text>
          </Text>
        ))}
      </Card>
    )

    // sources
    const srcIcon = { file: '▤', edit: '✎', url: '↗', search: '⌕' } as const
    const srcColor = { file: hexOf('read'), edit: hexOf('write'), url: hexOf('web'), search: hexOf('search') } as const
    const srcList = (kind: Source['kind'], title: string, limit: number) => {
      const list = d.sources.filter(s => s.kind === kind)
      if (!list.length) return null
      return (
        <Box flexDirection="column">
          <Text dimColor>
            {title} ({list.length})
          </Text>
          {list.slice(-limit).map(s => {
            const label = clip(kind === 'file' || kind === 'edit' ? base(s.ref) : s.ref, inner - 8)
            return (
              <Text>
                <Text color={css(srcColor[kind])}>{srcIcon[kind]} </Text>
                {kind === 'url' ? <Link href={s.ref} label={label} /> : <Text>{label}</Text>}
                {s.count > 1 ? <Text dimColor> ×{s.count}</Text> : null}
              </Text>
            )
          })}
        </Box>
      )
    }
    const full = current === 'sources'
    const sourcesCard = (
      <Card title="❖ Sources" extra={String(d.sources.length)}>
        {d.sources.length === 0 && <Text dimColor>none yet</Text>}
        {srcList('edit', 'Changed', full ? 30 : 5)}
        {srcList('file', 'Read', full ? 30 : 5)}
        {srcList('url', 'Web', full ? 30 : 5)}
        {srcList('search', 'Searches', full ? 30 : 5)}
      </Card>
    )
    const skillsCard = (
      <Card title="✦ Skills" extra={String(d.skills.length)}>
        {d.skills.length === 0 && <Text dimColor>none yet</Text>}
        {d.skills.map(s => (
          <Box justifyContent="space-between">
            <Text color={css(hexOf('skill'))}>{s.name}</Text>
            <Text dimColor>×{s.count}</Text>
          </Box>
        ))}
      </Card>
    )
    const mcpCard = (
      <Card title="⇄ MCP servers" extra={String(d.mcp.length)}>
        {d.mcp.length === 0 && <Text dimColor>none yet</Text>}
        {d.mcp.map(m => (
          <Box flexDirection="column">
            <Box justifyContent="space-between">
              <Text bold color={css(hexOf('mcp'))}>
                {m.name}
              </Text>
              <Text dimColor>×{m.count}</Text>
            </Box>
            {m.detail ? <Text dimColor>  {clip(m.detail, inner - 2)}</Text> : null}
          </Box>
        ))}
      </Card>
    )

    const body =
      current === 'flow' ? (
        <Box flexDirection="column">
          {flowCard}
          {agentsCard}
        </Box>
      ) : current === 'timeline' ? (
        timelineCard
      ) : current === 'sources' ? (
        <Box flexDirection="column">
          {sourcesCard}
          {skillsCard}
          {mcpCard}
        </Box>
      ) : (
        <Box flexDirection="column">
          {planCard}
          {activityCard}
          {flowCard}
          {agentsCard}
          {usageCard}
          {d.skills.length + d.mcp.length > 0 ? (
            <Card title="Tools & skills" extra={`${d.skills.length} skills · ${d.mcp.length} mcp`}>
              {d.skills.map(s => (
                <Text>
                  <Text color={css(hexOf('skill'))}>✦ {s.name}</Text>
                  <Text dimColor> ×{s.count}</Text>
                </Text>
              ))}
              {d.mcp.map(m => (
                <Text>
                  <Text color={css(hexOf('mcp'))}>⇄ {m.name}</Text>
                  <Text dimColor> ×{m.count}</Text>
                </Text>
              ))}
            </Card>
          ) : null}
          {d.sources.length > 0 ? sourcesCard : null}
        </Box>
      )

    return (
      <Box flexDirection="column">
        {tabs}
        {heroCard}
        {body}
      </Box>
    )
  })
}
