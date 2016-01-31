'use strict'

const fs = require('fs-plus')
const path = require('path')
const child = require('child_process')
const pkg = require('../../package.json')

const appFolder = path.resolve(process.execPath, '..')
const rootFolder = path.resolve(appFolder, '..')
const updateDotExe = path.join(rootFolder, 'Update.exe')
const exeName = path.basename(process.execPath)

const spawn = function (command, args, callback) {
  let spawnedProcess = null
  let error = null
  let stdout = ''

  try {
    spawnedProcess = child.spawn(command, args)
  } catch (processError) {
    process.nextTick(function () {
      callback(processError, stdout)
    })
    return
  }

  spawnedProcess.stdout.on('data', function (data) {
    stdout += data
  })

  spawnedProcess.on('error', function (processError) {
    error = error || processError
  })

  spawnedProcess.on('close', function (code, signal) {
    if (code !== 0) {
      error = error || new Error('Command failed: ' + (signal || code))
    }

    callback(error, stdout)
  })
}

const spawnUpdate = function (args, callback) {
  spawn(updateDotExe, args, callback)
}

const createShortcuts = function (callback) {
  spawnUpdate(['--createShortcut', exeName], callback)
}

const updateShortcuts = function (callback) {
  const homeDirectory = fs.getHomeDirectory()
  if (homeDirectory) {
    const desktopShortcutPath = path.join(homeDirectory, 'Desktop', `${pkg.name}.lnk`)
    fs.access(desktopShortcutPath, function (desktopShortcutExists) {
      createShortcuts(function () {
        if (desktopShortcutExists) {
          callback()
        } else {
          fs.unlink(desktopShortcutPath, callback)
        }
      })
    })
  } else {
    createShortcuts(callback)
  }
}

const removeShortcuts = function (callback) {
  spawnUpdate(['--removeShortcut', exeName], callback)
}

const handleCommand = function (app, cmd) {
  switch (cmd) {
    case 'install':
      createShortcuts(function () {
        app.quit()
      })
      return true
    case 'updated':
      updateShortcuts(function () {
        app.quit()
      })
      return true
    case 'uninstall':
      removeShortcuts(function () {
        app.quit()
      })
      return true
    case 'obsolete':
      app.quit()
      return true
    default:
      return false
  }
}

module.exports = {
  spawnUpdate: spawnUpdate,
  handleCommand: handleCommand
}
