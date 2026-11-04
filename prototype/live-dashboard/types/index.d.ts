export type Status = 'running' | 'done' | 'failed'
export type PlanStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped'
export type View = 'overview' | 'flow' | 'timeline' | 'sources'

export type AgentRow = {
  id: string
  parent: string
  label: string
  type: string
  status: Status
  startedAt: number
  endedAt?: number
}

export type Step = {
  id: string
  agent: string
  tool: string
  label: string
  status: Status
  at: number
  endedAt?: number
}

export type Tally = { name: string; count: number; detail?: string }

export type Source = { kind: 'file' | 'edit' | 'url' | 'search'; ref: string; count: number }

export type Note = { at: number; text: string; phase?: string; agent: string }

export type PlanItem = { title: string; status: PlanStatus }

export type Usage = { input: number; output: number; cacheRead: number; turns: number }

export type Dashboard = {
  goal: string
  turnStartedAt: number
  mainStatus: Status
  agents: AgentRow[]
  steps: Step[]
  skills: Tally[]
  mcp: Tally[]
  sources: Source[]
  notes: Note[]
  plan: PlanItem[]
  usage: Usage
}

declare module 'claude-code' {
  interface PluginState {
    'live-dashboard': { dash: Shaped<Dashboard>; frame: number; view: View }
  }
}
