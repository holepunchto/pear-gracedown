const os = require('bare-os')
const SignalEmitter = require('bare-signals/emitter')
const signals = new SignalEmitter()
signals.unref()
signals.kill = os.kill
module.exports = signals
