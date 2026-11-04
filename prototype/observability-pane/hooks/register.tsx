// Observability Pane (prototype): a live view of what Claude Code and its subagents are doing.
// Shows each agent and subagent, and a Process Monitor-style table of their tool calls (files, commands, fetches).
import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRow, Ev } from '../types'

const PANE = 'observability'
const events = atom({ plugin: 'observability-pane', key: 'events' } as const, [], { shape: 'events-1' })
const agents = atom({ plugin: 'observability-pane', key: 'agents' } as const, [], { shape: 'agents-1' })

const MAIN = 'main'
const now = () => new Date().toTimeString().slice(0, 8)

// Mask anything token-like so the pane never shows a secret.
const SECRET = /(gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|glpat-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+|[A-Fa-f0-9]{40,})/g
const mask = (s: string) => s.replace(SECRET, '<hidden>')
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

const KIND: Record<string, string> = {
  Read: 'file', Edit: 'file', Write: 'file', NotebookEdit: 'file', Glob: 'file', Grep: 'file',
  Bash: 'process', WebFetch: 'network', WebSearch: 'network', Agent: 'agent', Task: 'agent', Skill: 'skill',
}

function target(e: Record<string, unknown>): string {
  for (const k of ['file_path', 'notebook_path', 'command', 'url', 'query', 'pattern', 'description', 'skill', 'path']) {
    const v = e[k]
    if (typeof v === 'string' && v) return v.replace(/\s+/g, ' ')
  }
  return ''
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'observability', description: 'Open the Observability Pane' })
    await update($, agents, list => (list.some(a => a.id === MAIN) ? list : [{ id: MAIN, label: 'main agent', status: 'idle', since: now() }, ...list]))
    void $.ui.open({ id: PANE, title: 'Observability', columns: 100 })
    return next(e)
  })

  on('command.run', { command: 'observability' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Observability', columns: 100 })
    return { text: 'Observability Pane opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    const id = r.agentId
    if (id) {
      const label = clip(`${e.subagentType ?? 'agent'} · ${e.description ?? ''}`, 40)
      await update($, agents, list => [...list.filter(a => a.id !== id), { id, label, status: 'working', since: now() }].slice(-30))
      await update($, events, list => [...list, { id: `spawn-${id}`, t: now(), agent: e.parentAgentId ?? MAIN, kind: 'agent', op: 'spawn', target: label, status: 'ok' }].slice(-500))
    }
    return r
  })

  on('tool.call', async ($, e, next) => {
    const id = e.tool_use_id ?? `${Date.now()}-${Math.random()}`
    const agent = e.agentId ?? MAIN
    const ev: Ev = { id, t: now(), agent, kind: KIND[e.tool] ?? 'tool', op: e.tool, target: clip(mask(target(e as unknown as Record<string, unknown>)), 120), status: 'running' }
    await update($, events, list => [...list, ev].slice(-500))
    await update($, agents, list => list.map(a => (a.id === agent ? { ...a, status: 'working' } : a)))
    const res = await next(e)
    const status = 'deny' in res && res.deny ? 'refused' : 'isError' in res && (res as { isError?: boolean }).isError ? 'error' : 'ok'
    await update($, events, list => list.map(x => (x.id === id ? { ...x, status } : x)))
    return res
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, events)
    const ags = await read($, agents)
    const cols = e.props.bodyColumns ?? 80
    const room = Math.max(3, (e.viewport?.rows ?? 30) - ags.length - 6)
    const name = (id: string) => (id === MAIN ? 'main' : clip(ags.find(a => a.id === id)?.label ?? id.slice(0, 8), 18))
    const colour = (s: string) => (s === 'running' ? 'yellow' : s === 'ok' ? 'green' : 'red')
    return (
      <Box flexDirection="column">
        <Text bold>Agents</Text>
        {ags.map(a => (
          <Text>{a.id === MAIN ? '' : '└ '}{clip(a.label, 40)} <Text dimColor>since {a.since}</Text></Text>
        ))}
        <Text bold>Time     Agent              Kind     Op       Target</Text>
        {list.length === 0 && <Text dimColor>Nothing yet.</Text>}
        {list.slice(-room).map(x => (
          <Text>
            <Text dimColor>{x.t}</Text> {name(x.agent).padEnd(18)} {x.kind.padEnd(8)} <Text color={colour(x.status)}>{x.op.padEnd(8)}</Text> {clip(x.target, Math.max(10, cols - 48))}
          </Text>
        ))}
        <Text dimColor>prototype · tool calls and subagents · thinking, decisions, stages and alerts to come</Text>
      </Box>
    )
  })
}
