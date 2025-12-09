'use strict'
const program = global.Bare ? global.Bare : global.process
const { fileURLToPath } = require('url-file-url')
const arg = program.argv[program.argv.length - 1]
const filePath = arg.startsWith('file:') ? fileURLToPath(arg) : arg
require(filePath)
