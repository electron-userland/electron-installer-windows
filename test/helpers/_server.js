'use strict'

const http = require('http')
const finalHandler = require('finalhandler')
const serveStatic = require('serve-static')

module.exports = class Server {
  constructor (path, port) {
    const serve = serveStatic(path)

    this.port = port
    this.server = http.createServer((req, res) => {
      const handler = finalHandler(req, res)
      serve(req, res, handler)
    })
  }

  runServer () {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, resolve)
        .on('error', reject)
    })
  }

  closeServer () {
    return new Promise((resolve, reject) => {
      this.server.close(err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}
