'use strict'

const child = require('child_process')
/**
 * Execute a file.
 */
module.exports = function (options, file, args, callback) {
  let execdProcess = null
  let error = null
  let stderr = ''

  if (process.platform !== 'win32') {
    args = [file].concat(args)
    file = 'mono'
  }

  options.logger('Executing file ' + file + ' ' + args.join(' '))

  try {
    execdProcess = child.execFile(file, args)
  } catch (err) {
    process.nextTick(function () {
      callback(err, stderr)
    })
    return
  }

  execdProcess.stderr.on('data', function (data) {
    stderr += data
  })

  execdProcess.on('error', function (err) {
    error = error || err
  })

  execdProcess.on('close', function (code, signal) {
    if (code !== 0) {
      error = error || signal || code
    }

    callback(error && new Error('Error executing file (' + (error.message || error) + '): ' +
      '\n' + file + ' ' + args.join(' ') + '\n' + stderr))
  })
}
