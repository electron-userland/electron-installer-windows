'use strict'

const describeInstaller = require('./helpers/describe_installer')
const { describeInstallerWithException } = require('./helpers/describe_installer')
const Server = require('./helpers/server')

describe('module', function () {
  this.timeout(30000)

  describeInstaller('with an app with asar', true, {
    iconNuget: 'test/fixtures/icon.ico'
  })

  describeInstaller('with an app without asar', false, {
    icon: 'test/fixtures/icon.ico',
    exe: 'bartest.exe',
    tags: [
      'Utility'
    ]
  })

  describeInstallerWithException(
    'with no description provided',
    {
      src: 'test/fixtures/app-without-description-or-product-description/'
    },
    /^No Description provided/
  )

  describeInstallerWithException(
    'with no authors provided',
    {
      src: 'test/fixtures/app-without-authors/'
    },
    /^No Authors provided/
  )

  // Signing only works on Win32.
  if (process.platform === 'win32') {
    describeInstaller('with a signed app with asar', true, {
      certificateFile: 'test/fixtures/certificate.pfx',
      certificatePassword: 'test'
    })

    describeInstaller('with a signed app without asar', false, {
      icon: 'test/fixtures/icon.ico',
      exe: 'bartest.exe',
      tags: [
        'Utility'
      ],
      certificateFile: 'test/fixtures/certificate.pfx',
      certificatePassword: 'test'
    })
  }

  describe('with a releases server', function (test) {
    const server = new Server('test/fixtures/releases/', 3000)

    before(function (done) { server.runServer(done) })

    after(function (done) { server.closeServer(done) })

    describeInstaller('with an app with asar with the same remote release', true, {
      remoteReleases: 'http://localhost:3000/foo/'
    })

    describeInstaller('with an app without asar with an old remote release', false, {
      remoteReleases: 'http://localhost:3000/bar/'
    })
  })
})
