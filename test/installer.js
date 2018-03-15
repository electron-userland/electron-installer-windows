'use strict'

const describeInstaller = require('./helpers/describe_installer')
const serve = require('./helpers/serve')

describe('module', function () {
  this.timeout(20000)

  describeInstaller('with an app with asar', true, {
    productDescription: 'Just a test.'
  })

  describeInstaller('with an app without asar', false, {
    icon: 'test/fixtures/icon.ico',
    bin: 'bartest.exe',
    tags: [
      'Utility'
    ]
  })

  // Signing only works on Win32.
  if (process.platform === 'win32') {
    describeInstaller('with a signed app with asar', true, {
      productDescription: 'Just a test.',
      certificateFile: 'test/fixtures/certificate.pfx',
      certificatePassword: 'test'
    })

    describeInstaller('with a signed app without asar', false, {
      icon: 'test/fixtures/icon.ico',
      bin: 'bartest.exe',
      tags: [
        'Utility'
      ],
      certificateFile: 'test/fixtures/certificate.pfx',
      certificatePassword: 'test'
    })
  }

  describe('with a releases server', function (test) {
    let server

    before(() => serve('test/fixtures/releases/', 3000)
      .then(ser => (server = ser)))

    after(() => server.close())

    describeInstaller('with an app with asar with the same remote release', true, {
      productDescription: 'Just a test.',
      remoteReleases: 'http://localhost:3000/foo/'
    })

    describeInstaller('with an app without asar with an old remote release', false, {
      productDescription: 'Just a test.',
      remoteReleases: 'http://localhost:3000/bar/'
    })
  })
})
