'use strict'

const test = require('ava')
const describeInstaller = require('./helpers/_describe_installer')
const { describeInstallerWithException } = require('./helpers/_describe_installer')

describeInstaller(test, 'with an app with asar', true, {
  iconNuget: 'test/fixtures/icon.ico'
})

describeInstaller(test, 'with an app without asar', false, {
  icon: 'test/fixtures/icon.ico',
  exe: 'bartest.exe',
  tags: [
    'Utility'
  ]
})

describeInstallerWithException(
  test,
  'with no description provided',
  {
    src: 'test/fixtures/app-without-description-or-product-description/'
  },
  /^No Description provided/
)

describeInstallerWithException(
  test,
  'with no authors provided',
  {
    src: 'test/fixtures/app-without-authors/'
  },
  /^No Authors provided/
)

// Signing only works on Win32.
if (process.platform === 'win32') {
  describeInstaller(test, 'with a signed app with asar', true, {
    certificateFile: 'test/fixtures/certificate.pfx',
    certificatePassword: 'test'
  })

  describeInstaller(test, 'with a signed app without asar', false, {
    icon: 'test/fixtures/icon.ico',
    exe: 'bartest.exe',
    tags: [
      'Utility'
    ],
    certificateFile: 'test/fixtures/certificate.pfx',
    certificatePassword: 'test'
  })
}
