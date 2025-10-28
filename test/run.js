'use strict'
const program = global.Bare ? global.Bare : global.process
const { fileURLToPath } = require('url-file-url')
require(fileURLToPath(program.argv[program.argv.length - 1]))
