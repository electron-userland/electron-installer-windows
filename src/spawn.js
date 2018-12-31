'use strict'

const { spawn } = require('electron-installer-common')

module.exports = function (cmd, args, logger) {
  if (process.platform !== 'win32' && cmd !== './src/cli.js') {
    args.unshift(cmd)
    cmd = 'mono'
  }
  return spawn(cmd, args, logger, null)
}
