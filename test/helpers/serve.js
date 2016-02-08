'use strict'

var http = require('http')
var finalHandler = require('finalhandler')
var serveStatic = require('serve-static')

module.exports = function (path, port, callback) {
  var serve = serveStatic(path)

  var server = http.createServer(function (req, res) {
    var handler = finalHandler(req, res)
    serve(req, res, handler)
  })

  server.listen(port, callback)

  return server
}
