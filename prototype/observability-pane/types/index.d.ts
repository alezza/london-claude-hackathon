export type Ev = { id: string; t: string; agent: string; kind: string; op: string; target: string; status: string }
export type AgentRow = { id: string; label: string; status: string; since: string }

declare module 'claude-code' {
  interface PluginState {
    'observability-pane': { events: Shaped<Ev[]>; agents: Shaped<AgentRow[]> }
  }
}
