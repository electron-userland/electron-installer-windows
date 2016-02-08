'use strict'

var fs = require('fs')
var retry = require('retry')

module.exports = function (path, callback) {
  var operation = retry.operation({
    retries: 3,
    minTimeout: 500
  })

  operation.attempt(function () {
    fs.access(path, function (err) {
      if (operation.retry(err)) {
        return
      }

      callback(err ? operation.mainError() : null)
    })
  })
}
