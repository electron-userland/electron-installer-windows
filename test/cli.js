'use strict'

const describeCLI = require('./helpers/describe_cli')
const serve = require('./helpers/serve')

describe('cli', function () {
  this.timeout(20000)

  describeCLI('with an app with asar', true)

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
    let server

    before(() => serve('test/fixtures/releases/', 3000)
      .then(ser => (server = ser)))

    after(() => server.close())

    describeCLI('with a signed app with asar', true, {
      remoteReleases: 'http://localhost:3000/foo/'
    })

    describeCLI('with an app without asar with an old remote release', false, {
      remoteReleases: 'http://localhost:3000/bar/'
    })
  })
})
