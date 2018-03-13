'use strict'

var http = require('http-promise')
var finalHandler = require('finalhandler')
var serveStatic = require('serve-static')

module.exports = function (path, port) {
  var serve = serveStatic(path)

  var server = http.createServerAsync((req, res) => {
    var handler = finalHandler(req, res)
    serve(req, res, handler)
  })

  return server
    .listen(port)
    .then(() => server)
}
