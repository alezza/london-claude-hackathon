import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'observability-pane',
  component: 'Pane',
  requestId: 'observability',
  props: { title: 'Observability', isFocused: false, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

const engine = (on: any, tool: any = () => ({ result: {} })) => {
  on('command.register', () => ({ value: { command: 'observability' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('tool.call', tool)
}

test('an empty pane says so', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/proj', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /Nothing yet/ }))?.text).toBe('Nothing yet.')
  await ui.unmount()
})

test('tool calls show as rows with their kind and target, on every surface', async ($, on) => {
  engine(on, (_: unknown, e: { command?: string }) => (e.command === 'false' ? { result: {}, isError: true } : { result: {} }))
  await $.session.start({ cwd: '/proj', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/proj/src/a.ts' })
  await $.tool.call({ tool: 'Bash', command: 'false' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /src\/a\.ts/ }))?.text).toMatch(/main\s+file\s+Read\s+\/proj\/src\/a\.ts/)
    expect((await ui.find({ type: 'Text', text: /process/ }))?.text).toMatch(/Bash\s+false/)
    await ui.unmount()
  }
})

test('a token in a command is masked', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/proj', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'curl -H "Authorization: token ghp_abcdefghijklmnopqrstuvwxyz0123"' })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /ghp_/ })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /<hidden>/ }))?.text).toMatch(/token <hidden>/)
  await ui.unmount()
})
