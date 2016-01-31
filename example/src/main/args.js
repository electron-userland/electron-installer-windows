'use strict'

const yargs = require('yargs')

const extractSquirrelCommand = function (options) {
  if (options['squirrel-install']) {
    return 'install'
  }
  if (options['squirrel-updated']) {
    return 'updated'
  }
  if (options['squirrel-uninstall']) {
    return 'uninstall'
  }
  if (options['squirrel-obsolete']) {
    return 'obsolete'
  }
}

const parseArguments = function (app, args) {
  const options = yargs(args)
    .option('squirrel-install')
    .option('squirrel-updated')
    .option('squirrel-uninstall')
    .option('squirrel-obsolete')
    .argv

  const squirrelCommand = extractSquirrelCommand(options)

  return {
    squirrelCommand: squirrelCommand
  }
}

module.exports = {
  parseArguments: parseArguments
}
