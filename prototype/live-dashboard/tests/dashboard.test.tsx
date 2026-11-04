import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'live-dashboard',
  component: 'Pane',
  requestId: 'live-dashboard',
  props: {
    title: '◆ Claude Live',
    isFocused: true,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 60 },
    view: {},
  },
} as const

test('narration, plan, steps and views reach the pane', async ($, on) => {
  on('command.register', () => ({ value: { command: 'live' } }))
  on('tool.register', (_, e) => ({ value: { tool: `mcp__live-dashboard__${(e as { name: string }).name}` } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('prompt.submit', (_, e) => ({ text: e.text }) as never)
  on('clock.every', () => ({ value: undefined }) as never)
  on('ui.status', () => ({ value: undefined }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.prompt.submit({ text: 'Harden the login API', origin: { kind: 'composer' } } as never).catch(() => {})
  await $.turn.start({ text: 'Harden the login API', turnId: 't1' })
  await $.tool.call({ tool: 'mcp__live-dashboard__plan', steps: [
    { title: 'Read the auth middleware', status: 'done' },
    { title: 'Add rate limiting', status: 'running' },
    { title: 'Write tests', status: 'pending' },
  ] } as never)
  await $.tool.call({ tool: 'mcp__live-dashboard__narrate', text: 'Adding a token bucket per client', phase: 'Build' } as never)
  await $.tool.call({ tool: 'Read', file_path: '/src/auth/middleware.ts' })

  // A sub-agent report starts a main-loop turn too; it must not wipe the work.
  await $.prompt.submit({ text: '<agent report>', origin: { kind: 'peer' } } as never).catch(() => {})
  await $.turn.start({ text: '<agent report>', turnId: 't2' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /Harden the login API/ }))?.text).toContain('Harden')
  expect((await ui.find({ type: 'Text', text: /token bucket/ }))?.text).toContain('Build')
  expect((await ui.find({ type: 'Text', text: /Add rate limiting/ }))?.text).toContain('rate limiting')
  expect((await ui.find({ type: 'Text', text: /auth\/middleware\.ts/ }))?.text).toContain('Read')

  await ui.press({ key: 'tab-timeline' })
  expect((await ui.find({ type: 'Text', text: /\d\d:\d\d:\d\d .*Read/ }))?.text).toContain('middleware')

  await ui.press({ key: 'tab-sources' })
  expect((await ui.find({ type: 'Text', text: /^Read \(1\)/ }))?.text).toContain('Read')
  await ui.unmount()

  for (const surface of ['desktop', 'vscode', 'mobile'] as const) {
    const other = await $.ui.mount({ ...PANE, surface })
    expect(await other.find({ type: 'Text', text: /CLAUDE LIVE/ })).toBeTruthy()
    await other.unmount()
  }
})
