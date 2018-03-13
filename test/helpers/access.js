'use strict'

var fs = require('fs-extra')
var retry = require('promise-retry')

/**
 * `fs.access` which retries three times.
 */
module.exports = function (path) {
  return retry((retry, number) => {
    return fs.access(path)
      .catch(retry)
  }, {
    retries: 3,
    minTimeout: 500
  })
}
