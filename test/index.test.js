'use strict'
global.Pear = {}
const { isWindows, isNode, isBare } = require('which-runtime')
const { spawn } = isBare ? require('bare-subprocess') : require('child_process')
if (isNode) nodeSetup()
const run = require('pear-run')
const { test } = require('brittle')
const path = require('path')
const os = require('os')
const program = isBare ? global.Bare : global.process

if (isBare) os.chdir(__dirname)
else process.chdir(__dirname)

async function untilResult(pipe, opts = {}) {
  const { timeout = 10000, runFn, writeStart } = opts
  const res = new Promise((resolve, reject) => {
    let buffer = ''
    const timeoutId = setTimeout(() => reject(new Error('timed out')), timeout)
    pipe.on('data', (data) => {
      buffer += data.toString()
      if (buffer[buffer.length - 1] === '\n') {
        clearTimeout(timeoutId)
        resolve(buffer.trim())
      }
    })
    pipe.on('close', () => {
      clearTimeout(timeoutId)
      reject(new Error('unexpected closed'))
    })
  })
  if (opts.runFn) {
    await opts.runFn()
  } else if (writeStart === true) {
    pipe.write('start')
  }
  return res
}

function nodeSetup() {
  const cp = require('child_process')
  const { spawn } = require('child_process')
  cp.spawn = (...args) => {
    const sp = spawn(...args)
    sp.stdio[3].write('\u0000') // prevents pipe auto close in node
    return sp
  }
}

test('teardown default', { skip: isWindows }, async function (t) {
  t.plan(1)
  const dir = path.join(__dirname, 'fixtures', 'gracedown', 'index.js')

  const argv = program.argv.slice(1)
  program.argv.length = 1
  program.argv.push('run', dir)
  global.Pear = new (class TestAPI {
    static RUNTIME = program.argv[0]
    static RUNTIME_ARGV = []
    static RTI = { checkout: {} }
    app = { applink: 'pear://pear' }
  })()

  t.teardown(() => {
    delete global.Pear
    program.argv.length = 1
    program.argv.push(...argv)
  })
  const pipe = run(dir)

  const td = await untilResult(pipe, { runFn: () => pipe.end(), writeStart: true })
  t.is(td, 'teardown', 'teardown executed')
})

test('teardown on SIGTERM', { skip: isWindows }, async function (t) {
  t.plan(4)
  t.timeout(10000)

  const fixture = path.join(__dirname, 'fixtures', 'signal', 'index.js')
  const child = spawn(program.argv[0], [fixture], {
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let stderr = ''

  child.stderr.on('data', (data) => {
    stderr += data.toString()
  })

  const closed = new Promise((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }))
  })

  t.teardown(() => {
    if (child.exitCode === null) child.kill()
  })

  t.is(
    await untilResult(child.stdout),
    'ready',
    'child ready'
  )

  const cleanup = untilResult(child.stdout)
  child.kill('SIGTERM')

  const { code, signal } = await closed
  const status = signal === 'SIGTERM' ? 143 : signal ? 128 + signal : code

  t.is(status, 143, 'exited with SIGTERM')
  t.is(await cleanup, 'cleanup', 'teardown executed')
  t.is(stderr, '', 'no signal resend error')
})
