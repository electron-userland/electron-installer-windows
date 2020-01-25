'use strict'

const http = require('http')
const finalHandler = require('finalhandler')
const serveStatic = require('serve-static')

module.exports = class Server {
  constructor (path, port) {
    const serve = serveStatic(path)

    this.port = port
    this.server = http.createServer((req, res) => {
      serve(req, res, finalHandler(req, res))
    })
  }

  runServer (done) {
    this.server.listen(this.port, done)
      .on('error', function (error) {
        done(error)
      })
  }

  closeServer (done) {
    this.server.close(done)
      .on('error', function (error) {
        done(error)
      })
  }
}
