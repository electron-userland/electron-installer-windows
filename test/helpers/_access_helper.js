'use strict'

const fs = require('fs-extra')
const path = require('path')
const retry = require('promise-retry')

// `fs.access` which retries three times and returns a promise
function testAccess (path) {
  return retry(function (retry, number) {
    return fs.access(path)
      .catch(retry)
  }, {
    retries: 3,
    minTimeout: 500
  })
}

async function access (t, dir, filename) {
  await t.notThrowsAsync(testAccess(path.join(dir, filename)))
}

function accessAll (test, desc, appName, dir, cli) {
  const module = cli ? 'setup' : 'installer'

  test(`${desc} - generates a 'RELEASES' manifest`, access, dir, 'RELEASES')
  test(`${desc} - generates a '.nupkg' package`, access, dir, `${appName}-0.0.1-full.nupkg`)
  test(`${desc} - generates a ''.exe' package`, access, dir, `${appName}-0.0.1-${module}.exe`)
  if (process.platform === 'win32') {
    test(`${desc} - generates a '.msi' package`, access, dir, `${appName}-0.0.1-${module}.msi`)
  }
}

module.exports = {
  testAccess,
  access,
  accessAll
}
