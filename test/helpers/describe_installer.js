'use strict'

const chai = require('chai')
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp-promise')
const access = require('./access_helper').access
const testAccess = require('./access_helper').testAccess
const accessAll = require('./access_helper').accessAll

const installer = require('../..')

module.exports = function (desc, asar, testOptions) {
  let appName
  let options = {}

  asar ? appName = 'footest' : appName = 'bartest'
  asar ? options.src = 'test/fixtures/app-with-asar/' : options.src = 'test/fixtures/app-without-asar/'

  options.dest = tmp.tmpNameSync({ prefix: 'electron-installer-windows-' })
  options.options = testOptions
  options.rename = (dest, src) => {
    const ext = path.extname(src)
    if (ext === '.exe' || ext === '.msi') {
      src = `<%= name %>-<%= version %>-installer${ext}`
    }
    return path.join(dest, src)
  }

  describe(desc, test => {
    before(() => installer(options))

    after(() => fs.remove(options.dest))

    accessAll(appName, options.dest, false)

    if (testOptions.remoteReleases && asar) {
      it('does not generate a delta `.nupkg` package', () => {
        return testAccess(`${options.dest}/${appName}-0.0.1-delta.nupkg`)
          .then(() => {
            throw new Error('delta `.nupkg` was created')
          }).catch(error => chai.expect(error.message).to.have.string('no such file or directory'))
      })
    }

    if (testOptions.remoteReleases && !asar) {
      access('generates a delta `.nupkg` package', options.dest, `${appName}-0.0.1-delta.nupkg`)
    }
  })
}
