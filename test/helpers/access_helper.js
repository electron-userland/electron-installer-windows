'use strict'

const fs = require('fs-extra')
const path = require('path')
const retry = require('promise-retry')

// `fs.access` which retries three times.
function testAccess (path) {
  return retry(function (retry, number) {
    return fs.access(path)
      .catch(retry)
  }, {
    retries: 3,
    minTimeout: 500
  })
}

function access (desc, dir, filename) {
  it(desc, function () {
    return testAccess(path.join(dir, filename))
  })
}

function accessAll (appName, dir, cli) {
  let test
  cli ? test = 'setup' : test = 'installer'

  access('generates a `RELEASES` manifest', dir, 'RELEASES')
  access('generates a `.nupkg` package', dir, `${appName}-0.0.1-full.nupkg`)
  access('generates a `.exe` package', dir, `${appName}-0.0.1-${test}.exe`)
  if (process.platform === 'win32') {
    access('generates a `.msi` package', dir, `${appName}-0.0.1-${test}.msi`)
  }
}

module.exports = {
  testAccess,
  access,
  accessAll
}
