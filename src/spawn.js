'use strict'

const { spawn } = require('@malept/cross-spawn-promise')
const which = require('which')

function updateExecutableMissingException (err, hasLogger) {
  if (hasLogger && err.code === 'ENOENT' && err.syscall === 'spawn mono') {
    let installer
    let pkg

    if (process.platform === 'darwin') {
      installer = 'brew'
      pkg = 'mono'
    } else if (which.sync('dnf', { nothrow: true })) {
      installer = 'dnf'
      pkg = 'mono-core'
    } else { // assume apt-based Linux distro
      installer = 'apt'
      pkg = 'mono-runtime'
    }

    err.message = `Your system is missing the ${pkg} package. Try, e.g. '${installer} install ${pkg}'`
  }
}

module.exports = async function (cmd, args, logger) {
  if (process.platform !== 'win32') {
    args.unshift(cmd)
    cmd = 'mono'
  }
  return spawn(cmd, args, {
    logger,
    updateErrorCallback: updateExecutableMissingException
  })
}
