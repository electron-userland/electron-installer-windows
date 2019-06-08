'use strict'

const chai = require('chai')
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp-promise')
const { access, testAccess, accessAll } = require('./access_helper')

const installer = require('../..')

module.exports = function describeInstaller (desc, asar, testOptions) {
  const [appName, options] = installerOptions(asar, testOptions)

  describe(desc, test => {
    before(async () => installer(options))

    after(async () => fs.remove(options.dest))

    accessAll(appName, options.dest, false)

    if (testOptions.remoteReleases && asar) {
      it('does not generate a delta `.nupkg` package', async () => {
        try {
          await testAccess(`${options.dest}/${appName}-0.0.1-delta.nupkg`)
          throw new Error('delta `.nupkg` was created')
        } catch (error) {
          chai.expect(error.message).to.have.string('no such file or directory')
        }
      })
    }

    if (testOptions.remoteReleases && !asar) {
      access('generates a delta `.nupkg` package', options.dest, `${appName}-0.0.1-delta.nupkg`)
    }
  })
}

module.exports.describeInstallerWithException = function describeInstallerWithException (desc, testOptions, errorRegex) {
  const [, options] = installerOptions(false, testOptions)
  options.src = testOptions.src

  describe(desc, test => {
    it('throws an error', async () => {
      try {
        await installer(options)
      } catch (error) {
        chai.expect(error.message).to.match(errorRegex)
      }
    })

    after(async () => fs.remove(options.dest))
  })
}

function installerOptions (asar, testOptions) {
  let options = {}

  const appName = asar ? 'footest' : 'bartest'

  options.src = asar ? 'test/fixtures/app-with-asar/' : 'test/fixtures/app-without-asar/'
  options.dest = tmp.tmpNameSync({ prefix: 'electron-installer-windows-' })
  options.options = testOptions
  options.rename = (dest, src) => {
    const ext = path.extname(src)
    if (ext === '.exe' || ext === '.msi') {
      src = `<%= name %>-<%= version %>-installer${ext}`
    }
    return path.join(dest, src)
  }

  return [appName, options]
}
