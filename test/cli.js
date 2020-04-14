'use strict'

const test = require('ava')
const describeCLI = require('./helpers/_describe_cli')

describeCLI(test, 'with an app with asar', true, {
  version: '1.0.0-alpha.1'
})

describeCLI(test, 'with an app without asar', false)

// Signing only works on Win32.
if (process.platform === 'win32') {
  describeCLI(test, 'with a signed app with asar', true, {
    certificateFile: 'test/fixtures/certificate.pfx',
    certificatePassword: 'test'
  })

  describeCLI(test, 'with a signed app without asar', false, {
    certificateFile: 'test/fixtures/certificate.pfx',
    certificatePassword: 'test'
  })
}
