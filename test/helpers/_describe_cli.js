'use strict'

const fs = require('fs-extra')
const { spawn } = require('@malept/cross-spawn-promise')
const tmp = require('tmp-promise')
const { access, accessAll } = require('./_access_helper')

function printLogs (logs) {
  if (process.env.DEBUG === 'electron-installer-windows') {
    logs = logs.split('\n')
    return logs.forEach((line) => {
      line = line.split(' ')
      if (line[1] === 'electron-installer-windows') {
        console.log('\t\x1b[34m%s\x1b[0m', line[1], line.splice(2).join(' '))
      } else {
        console.log('\t', line.join(' '))
      }
    })
  }
}

module.exports = function (test, desc, asar, options = {}) {
  const appName = asar ? 'footest' : 'bartest'

  options.src = asar ? 'test/fixtures/app-with-asar/' : 'test/fixtures/app-without-asar/'
  options.dest = tmp.tmpNameSync({ prefix: 'electron-installer-windows-' })

  const args = ['--src', options.src, '--dest', options.dest]

  if (options.certificateFile && options.certificatePassword) {
    args.push('--certificateFile', options.certificateFile)
    args.push('--certificatePassword', options.certificatePassword)
  }
  if (options.remoteReleases) args.push('--remoteReleases', options.remoteReleases)

  test.before(async t => {
    const logs = await spawn('./src/cli.js', args)
    printLogs(logs)
  })

  test.after.always(async t => {
    await fs.remove(options.dest)
  })

  accessAll(test, desc, appName, options.dest, true)

  if (options.remoteReleases && asar) {
    test(`${desc} - does not generate a delta '.nupkg' package`, async t => {
      t.false(await fs.pathExists(`${options.dest}/${appName}-0.0.1-delta.nupkg`))
    })
  }

  if (options.remoteReleases && !asar) {
    test(`${desc} - generates a delta '.nupkg' package`, access, options.dest, `${appName}-0.0.1-delta.nupkg`)
  }
}
