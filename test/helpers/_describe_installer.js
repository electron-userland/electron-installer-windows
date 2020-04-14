'use strict'

const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp-promise')
const { access, testAccess, accessAll } = require('./_access_helper')

const installer = require('../../src/installer')

module.exports = function describeInstaller (test, desc, asar, testOptions) {
  const [appName, options] = installerOptions(asar, testOptions)

  test.before(async t => {
    await installer(options)
  })

  test.after.always(async t => {
    await fs.remove(options.dest)
  })

  accessAll(test, desc, appName, options.dest, false)

  if (testOptions.remoteReleases && asar) {
    test(`${desc} - does not generate a delta '.nupkg' package`, async t => {
      await t.throwsAsync(
        testAccess(`${options.dest}/${appName}-0.0.1-delta.nupkg`),
        { message: new RegExp('no such file or directory') }
      )
    })
  }

  if (testOptions.remoteReleases && !asar) {
    test(`${desc} - generates a delta '.nupkg' package`, access, options.dest, `${appName}-0.0.1-delta.nupkg`)
  }
}

module.exports.describeInstallerWithException = function describeInstallerWithException (test, desc, testOptions, errorRegex) {
  const [, options] = installerOptions(false, testOptions)
  options.src = testOptions.src

  test.after.always(async t => {
    await fs.remove(options.dest)
  })

  test(`${desc} - throws an error`, async t => {
    await t.throwsAsync(installer(options), { message: errorRegex })
  })
}

function installerOptions (asar, testOptions) {
  const options = {}

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
