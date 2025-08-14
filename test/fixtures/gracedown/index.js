const pipe = require('pear-pipe')()
pipe.autoexit = false
const gracedown = require('../../..')
gracedown(async () => {
  await new Promise((resolve) => {
    pipe.write('teardown\n', resolve)
  })
})
