'use strict'

const chai = require('chai')
const fs = require('fs-extra')
const access = require('./helpers/access')
const spawn = require('./helpers/spawn')
const serve = require('./helpers/serve')

describe('cli', function () {
  this.timeout(20000)

  describe('with an app with asar', function (test) {
    const dest = 'test/fixtures/out/foo/'

    before(() => spawn('./src/cli.js', [
      '--src', 'test/fixtures/app-with-asar/',
      '--dest', dest
    ]))

    after(() => fs.remove(dest))

    it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

    it('generates a `.nupkg` package', () => access(dest + 'footest-0.0.1-full.nupkg'))

    it('generates a `.exe` package', () => access(dest + 'footest-0.0.1-setup.exe'))

    if (process.platform === 'win32') {
      it('generates a `.msi` package', () => access(dest + 'footest-0.0.1-setup.msi'))
    }
  })

  describe('with an app without asar', function (test) {
    const dest = 'test/fixtures/out/bar/'

    before(() => spawn('./src/cli.js', [
      '--src', 'test/fixtures/app-without-asar/',
      '--dest', dest
    ]))

    after(() => fs.remove(dest))

    it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

    it('generates a `.nupkg` package', () => access(dest + 'bartest-0.0.1-full.nupkg'))

    it('generates a `.exe` package', () => access(dest + 'bartest-0.0.1-setup.exe'))

    if (process.platform === 'win32') {
      it('generates a `.msi` package', () => access(dest + 'bartest-0.0.1-setup.msi'))
    }
  })

  // Signing only works on Win32.
  if (process.platform === 'win32') {
    describe('with a signed app with asar', function (test) {
      const dest = 'test/fixtures/out/foo/'

      before(() => spawn('./src/cli.js', [
        '--src', 'test/fixtures/app-with-asar/',
        '--dest', dest,
        '--certificateFile', 'test/fixtures/certificate.pfx',
        '--certificatePassword', 'test'
      ]))

      after(() => fs.remove(dest))

      it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

      it('generates a `.nupkg` package', () => access(dest + 'footest-0.0.1-full.nupkg'))

      it('generates a `.exe` package', () => access(dest + 'footest-0.0.1-setup.exe'))

      it('generates a `.msi` package', () => access(dest + 'footest-0.0.1-setup.msi'))
    })

    describe('with a signed app without asar', function (test) {
      const dest = 'test/fixtures/out/bar/'

      before(() => spawn('./src/cli.js', [
        '--src', 'test/fixtures/app-without-asar/',
        '--dest', dest,
        '--certificateFile', 'test/fixtures/certificate.pfx',
        '--certificatePassword', 'test'
      ]))

      after(() => fs.remove(dest))

      it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

      it('generates a `.nupkg` package', () => access(dest + 'bartest-0.0.1-full.nupkg'))

      it('generates a `.exe` package', () => access(dest + 'bartest-0.0.1-setup.exe'))

      it('generates a `.msi` package', () => access(dest + 'bartest-0.0.1-setup.msi'))
    })
  }

  describe('with a releases server', function (test) {
    let server

    before((done) => {
      server = serve('test/fixtures/releases/', 3000, done)
    })

    after((done) => {
      server.close(done)
    })

    describe('with an app with asar with the same remote release', function (test) {
      const dest = 'test/fixtures/out/foo/'

      before(() => spawn('./src/cli.js', [
        '--src', 'test/fixtures/app-with-asar/',
        '--dest', dest,
        '--remoteReleases', 'http://localhost:3000/foo/'
      ]))

      after(() => fs.remove(dest))

      it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

      it('does not generate a delta `.nupkg` package', () => {
        return access(dest + 'footest-0.0.1-delta.nupkg')
          .then(() => {
            throw new Error('delta `.nupkg` was created')
          })
          .catch(error => chai.expect(error.message).to.have.string('no such file or directory'))
      })

      it('generates a full `.nupkg` package', () => access(dest + 'footest-0.0.1-full.nupkg'))

      it('generates a `.exe` package', () => access(dest + 'footest-0.0.1-setup.exe'))

      if (process.platform === 'win32') {
        it('generates a `.msi` package', () => access(dest + 'footest-0.0.1-setup.msi'))
      }
    })

    describe('with an app without asar with an old remote release', function (test) {
      const dest = 'test/fixtures/out/bar/'

      before(() => spawn('./src/cli.js', [
        '--src', 'test/fixtures/app-without-asar/',
        '--dest', dest,
        '--remoteReleases', 'http://localhost:3000/bar/'
      ]))

      after(() => fs.remove(dest))

      it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

      it('generates a delta `.nupkg` package', () => access(dest + 'bartest-0.0.1-delta.nupkg'))

      it('generates a full `.nupkg` package', () => access(dest + 'bartest-0.0.1-full.nupkg'))

      it('generates a `.exe` package', () => access(dest + 'bartest-0.0.1-setup.exe'))

      if (process.platform === 'win32') {
        it('generates a `.msi` package', () => access(dest + 'bartest-0.0.1-setup.msi'))
      }
    })
  })
})
