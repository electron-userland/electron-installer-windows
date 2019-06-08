'use strict'

const describeInstaller = require('./helpers/describe_installer')
const { describeInstallerWithException } = require('./helpers/describe_installer')
const Server = require('./helpers/server')

describe('module', function () {
  this.timeout(30000)

  describeInstaller('with an app with asar', true, {
    productDescription: 'Just a test.'
  })

  describeInstaller('with an app without asar', false, {
    icon: 'test/fixtures/icon.ico',
    exe: 'bartest.exe',
    tags: [
      'Utility'
    ]
  })

  describeInstallerWithException(
    'with no description or productDescription provided',
    {
      src: 'test/fixtures/app-without-description-or-product-description/'
    },
    /^No Description or ProductDescription provided/
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
      productDescription: 'Just a test.',
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

    before(async () => server.runServer())

    after(async () => server.closeServer())

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
