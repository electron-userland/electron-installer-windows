'use strict'

const describeCLI = require('./helpers/describe_cli')
const Server = require('./helpers/server')

describe('cli', function () {
  this.timeout(60000)

  describeCLI('with an app with asar', true, {
    version: '1.0.0-alpha.1'
  })

  describeCLI('with an app without asar', false)

  // Signing only works on Win32.
  if (process.platform === 'win32') {
    describeCLI('with a signed app with asar', true, {
      certificateFile: 'test/fixtures/certificate.pfx',
      certificatePassword: 'test'
    })

    describeCLI('with a signed app without asar', false, {
      certificateFile: 'test/fixtures/certificate.pfx',
      certificatePassword: 'test'
    })
  }

  describe('with a releases server', function (test) {
    this.timeout(90000)

    const server = new Server('test/fixtures/releases/', 3000)

    before(function (done) { server.runServer(done) })

    after(function (done) { server.closeServer(done) })

    describeCLI('with an app with asar with the same remote release', true, {
      remoteReleases: 'http://localhost:3000/foo/'
    })

    describeCLI('with an app without asar with an old remote release', false, {
      remoteReleases: 'http://localhost:3000/bar/'
    })
  })
})
