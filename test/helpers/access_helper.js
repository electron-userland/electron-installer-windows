'use strict'

const fs = require('fs-extra')
const path = require('path')
const retry = require('promise-retry')

// `fs.access` which retries three times.
module.exports.testAccess = (path) => retry((retry, number) => {
  return fs.access(path)
    .then(() => 'done accessing')
    .catch(retry)
}, { retries: 3, minTimeout: 500 })

module.exports.access = (desc, dir, filename) => {
  it(desc, () => module.exports.testAccess(path.join(dir, filename)))
}

module.exports.accessAll = (appName, dir, cli) => {
  let test
  cli ? test = 'setup' : test = 'installer'

  module.exports.access('generates a `RELEASES` manifest', dir, 'RELEASES')
  module.exports.access('generates a `.nupkg` package', dir, `${appName}-0.0.1-full.nupkg`)
  module.exports.access('generates a `.exe` package', dir, `${appName}-0.0.1-${test}.exe`)
  if (process.platform === 'win32') {
    module.exports.access('generates a `.msi` package', dir, `${appName}-0.0.1-${test}.msi`)
  }
}
