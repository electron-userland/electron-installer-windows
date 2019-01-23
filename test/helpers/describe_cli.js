'use strict'

const chai = require('chai')
const fs = require('fs-extra')
const { spawn } = require('electron-installer-common')
const tmp = require('tmp-promise')
const access = require('./access_helper').access
const testAccess = require('./access_helper').testAccess
const accessAll = require('./access_helper').accessAll

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

module.exports = function (desc, asar, options) {
  let appName
  asar ? appName = 'footest' : appName = 'bartest'

  if (!options) options = {}
  asar ? options.src = 'test/fixtures/app-with-asar/' : options.src = 'test/fixtures/app-without-asar/'

  options.dest = tmp.tmpNameSync({ prefix: 'electron-installer-windows-' })

  const args = [ '--src', options.src, '--dest', options.dest ]

  if (options.certificateFile && options.certificatePassword) {
    args.push('--certificateFile', options.certificateFile)
    args.push('--certificatePassword', options.certificatePassword)
  }
  if (options.remoteReleases) args.push('--remoteReleases', options.remoteReleases)

  describe(desc, test => {
    before((done) => {
      spawn('./src/cli.js', args, null, null)
        .then(logs => printLogs(logs))
        .then(() => done())
    })

    after(() => fs.remove(options.dest))

    accessAll(appName, options.dest, true)

    if (options.remoteReleases && asar) {
      it('does not generate a delta `.nupkg` package', () => {
        return testAccess(`${options.dest}/${appName}-0.0.1-delta.nupkg'`)
          .then(() => {
            throw new Error('delta `.nupkg` was created')
          }).catch(error => chai.expect(error.message).to.have.string('no such file or directory'))
      })
    }

    if (options.remoteReleases && !asar) {
      access('generates a delta `.nupkg` package', options.dest, `${appName}-0.0.1-delta.nupkg`)
    }
  })
}
