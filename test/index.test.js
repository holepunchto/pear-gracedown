'use strict'
const run = require('pear-run')
global.Pear = {}
const { test } = require('brittle')
const { isWindows, isBare } = require('which-runtime')
const path = require('bare-path')
const os = require('bare-os')
os.chdir(__dirname)

async function untilResult(pipe, opts = {}) {
  const timeout = opts.timeout || 10000
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
  } else {
    pipe.write('start')
  }
  return res
}

test('teardown default', { skip: !isBare || isWindows }, async function (t) {
  t.plan(1)
  const dir = path.join(__dirname, 'fixtures', 'gracedown')

  const argv = global.Bare.argv.slice(1)
  global.Bare.argv.length = 1
  global.Bare.argv.push('run', dir)
  global.Pear = new (class TestAPI {
    static RUNTIME = global.Bare.argv[0]
    static RUNTIME_ARGV = []
    static RTI = { checkout: {} }
    app = { applink: 'pear://pear' }
  })()

  t.teardown(() => {
    delete global.Pear
    global.Bare.argv.length = 1
    global.Bare.argv.push(...argv)
  })

  const pipe = run(dir)

  const td = await untilResult(pipe, { runFn: () => pipe.end() })
  t.is(td, 'teardown', 'teardown executed')
})
