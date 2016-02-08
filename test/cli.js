'use strict'

var rimraf = require('rimraf')
var access = require('./helpers/access')
var serve = require('./helpers/serve')
var spawn = require('./helpers/spawn')

describe('cli', function () {
  this.timeout(20000)

  describe('with an app with asar', function (test) {
    var dest = 'test/fixtures/out/foo/'

    before(function (done) {
      spawn('node src/cli.js', [
        '--src', 'test/fixtures/app-with-asar/',
        '--dest', dest
      ], done)
    })

    after(function (done) {
      rimraf(dest, done)
    })

    it('generates a `RELEASES` manifest', function (done) {
      access(dest + 'RELEASES', done)
    })

    it('generates a `.nupkg` package', function (done) {
      access(dest + 'footest-0.0.1-full.nupkg', done)
    })

    it('generates a `.exe` package', function (done) {
      access(dest + 'footest-0.0.1-setup.exe', done)
    })

    if (process.platform === 'win32') {
      it('generates a `.msi` package', function (done) {
        access(dest + 'footest-0.0.1-setup.msi', done)
      })
    }
  })

  describe('with an app without asar', function (test) {
    var dest = 'test/fixtures/out/bar/'

    before(function (done) {
      spawn('node src/cli.js', [
        '--src', 'test/fixtures/app-without-asar/',
        '--dest', dest
      ], done)
    })

    after(function (done) {
      rimraf(dest, done)
    })

    it('generates a `RELEASES` manifest', function (done) {
      access(dest + 'RELEASES', done)
    })

    it('generates a `.nupkg` package', function (done) {
      access(dest + 'bartest-0.0.1-full.nupkg', done)
    })

    it('generates a `.exe` package', function (done) {
      access(dest + 'bartest-0.0.1-setup.exe', done)
    })

    if (process.platform === 'win32') {
      it('generates a `.msi` package', function (done) {
        access(dest + 'bartest-0.0.1-setup.msi', done)
      })
    }
  })

  // Signing only works on Win32.
  if (process.platform === 'win32') {
    describe('with a signed app with asar', function (test) {
      var dest = 'test/fixtures/out/foo/'

      before(function (done) {
        spawn('node src/cli.js', [
          '--src', 'test/fixtures/app-with-asar/',
          '--dest', dest,
          '--certificateFile', 'test/fixtures/certificate.pfx',
          '--certificatePassword', 'test'
        ], done)
      })

      after(function (done) {
        rimraf(dest, done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        access(dest + 'RELEASES', done)
      })

      it('generates a `.nupkg` package', function (done) {
        access(dest + 'footest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        access(dest + 'footest-0.0.1-setup.exe', done)
      })

      it('generates a `.msi` package', function (done) {
        access(dest + 'footest-0.0.1-setup.msi', done)
      })
    })

    describe('with a signed app without asar', function (test) {
      var dest = 'test/fixtures/out/bar/'

      before(function (done) {
        spawn('node src/cli.js', [
          '--src', 'test/fixtures/app-without-asar/',
          '--dest', dest,
          '--certificateFile', 'test/fixtures/certificate.pfx',
          '--certificatePassword', 'test'
        ], done)
      })

      after(function (done) {
        rimraf(dest, done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        access(dest + 'RELEASES', done)
      })

      it('generates a `.nupkg` package', function (done) {
        access(dest + 'bartest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        access(dest + 'bartest-0.0.1-setup.exe', done)
      })

      it('generates a `.msi` package', function (done) {
        access(dest + 'bartest-0.0.1-setup.msi', done)
      })
    })
  }

  describe('with a releases server', function (test) {
    var server

    before(function (done) {
      server = serve('test/fixtures/releases/', 3000, done)
    })

    after(function (done) {
      server.close(done)
    })

    describe('with an app with asar with the same remote release', function (test) {
      var dest = 'test/fixtures/out/foo/'

      before(function (done) {
        spawn('node src/cli.js', [
          '--src', 'test/fixtures/app-with-asar/',
          '--dest', dest,
          '--remoteReleases', 'http://localhost:3000/foo/'
        ], done)
      })

      after(function (done) {
        rimraf(dest, done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        access(dest + 'RELEASES', done)
      })

      it('does not generate a delta `.nupkg` package', function (done) {
        access(dest + 'footest-0.0.1-delta.nupkg', function (err) {
          done(!err)
        })
      })

      it('generates a full `.nupkg` package', function (done) {
        access(dest + 'footest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        access(dest + 'footest-0.0.1-setup.exe', done)
      })

      if (process.platform === 'win32') {
        it('generates a `.msi` package', function (done) {
          access(dest + 'footest-0.0.1-setup.msi', done)
        })
      }
    })

    describe('with an app without asar with an old remote release', function (test) {
      var dest = 'test/fixtures/out/bar/'

      before(function (done) {
        spawn('node src/cli.js', [
          '--src', 'test/fixtures/app-without-asar/',
          '--dest', dest,
          '--remoteReleases', 'http://localhost:3000/bar/'
        ], done)
      })

      after(function (done) {
        rimraf(dest, done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        access(dest + 'RELEASES', done)
      })

      it('generates a delta `.nupkg` package', function (done) {
        access(dest + 'bartest-0.0.1-delta.nupkg', done)
      })

      it('generates a full `.nupkg` package', function (done) {
        access(dest + 'bartest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        access(dest + 'bartest-0.0.1-setup.exe', done)
      })

      if (process.platform === 'win32') {
        it('generates a `.msi` package', function (done) {
          access(dest + 'bartest-0.0.1-setup.msi', done)
        })
      }
    })
  })
})
