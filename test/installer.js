'use strict'

var installer = require('..')

var fs = require('fs')
var path = require('path')
var rimraf = require('rimraf')
var serve = require('./helpers/serve')

describe('module', function () {
  this.timeout(20000)

  describe('with an app with asar', function (test) {
    var dest = 'test/fixtures/out/foo/'

    before(function (done) {
      installer({
        src: 'test/fixtures/app-with-asar/',
        dest: dest,
        rename: function (dest, src) {
          var ext = path.extname(src)
          if (ext === '.exe' || ext === '.msi') {
            src = '<%= name %>-<%= version %>-installer' + ext
          }
          return path.join(dest, src)
        },

        options: {
          productDescription: 'Just a test.'
        }
      }, done)
    })

    after(function (done) {
      rimraf(dest, done)
    })

    it('generates a `RELEASES` manifest', function (done) {
      fs.access(dest + 'RELEASES', done)
    })

    it('generates a `.nupkg` package', function (done) {
      fs.access(dest + 'footest-0.0.1-full.nupkg', done)
    })

    it('generates a `.exe` package', function (done) {
      fs.access(dest + 'footest-0.0.1-installer.exe', done)
    })

    if (process.platform === 'win32') {
      it('generates a `.msi` package', function (done) {
        fs.access(dest + 'footest-0.0.1-installer.msi', done)
      })
    }
  })

  describe('with an app without asar', function (test) {
    var dest = 'test/fixtures/out/bar/'

    before(function (done) {
      installer({
        src: 'test/fixtures/app-without-asar/',
        dest: dest,
        rename: function (dest, src) {
          var ext = path.extname(src)
          if (ext === '.exe' || ext === '.msi') {
            src = '<%= name %>-<%= version %>-installer' + ext
          }
          return path.join(dest, src)
        },

        options: {
          icon: 'test/fixtures/icon.ico',
          bin: 'bartest.exe',
          tags: [
            'Utility'
          ]
        }
      }, done)
    })

    after(function (done) {
      rimraf(dest, done)
    })

    it('generates a `RELEASES` manifest', function (done) {
      fs.access(dest + 'RELEASES', done)
    })

    it('generates a `.nupkg` package', function (done) {
      fs.access(dest + 'bartest-0.0.1-full.nupkg', done)
    })

    it('generates a `.exe` package', function (done) {
      fs.access(dest + 'bartest-0.0.1-installer.exe', done)
    })

    if (process.platform === 'win32') {
      it('generates a `.msi` package', function (done) {
        fs.access(dest + 'bartest-0.0.1-installer.msi', done)
      })
    }
  })

  // Signing only works on Win32.
  if (process.platform === 'win32') {
    describe('with a signed app with asar', function (test) {
      var dest = 'test/fixtures/out/foo/'

      before(function (done) {
        installer({
          src: 'test/fixtures/app-with-asar/',
          dest: dest,
          rename: function (dest, src) {
            var ext = path.extname(src)
            if (ext === '.exe' || ext === '.msi') {
              src = '<%= name %>-<%= version %>-installer' + ext
            }
            return path.join(dest, src)
          },

          options: {
            productDescription: 'Just a test.',
            certificateFile: 'test/fixtures/certificate.pfx',
            certificatePassword: 'test'
          }
        }, done)
      })

      after(function (done) {
        rimraf(dest, done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        fs.access(dest + 'RELEASES', done)
      })

      it('generates a `.nupkg` package', function (done) {
        fs.access(dest + 'footest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        fs.access(dest + 'footest-0.0.1-installer.exe', done)
      })

      it('generates a `.msi` package', function (done) {
        fs.access(dest + 'footest-0.0.1-installer.msi', done)
      })
    })

    describe('with a signed app without asar', function (test) {
      var dest = 'test/fixtures/out/bar/'

      before(function (done) {
        installer({
          src: 'test/fixtures/app-without-asar/',
          dest: dest,
          rename: function (dest, src) {
            var ext = path.extname(src)
            if (ext === '.exe' || ext === '.msi') {
              src = '<%= name %>-<%= version %>-installer' + ext
            }
            return path.join(dest, src)
          },

          options: {
            icon: 'test/fixtures/icon.ico',
            bin: 'bartest.exe',
            tags: [
              'Utility'
            ],
            certificateFile: 'test/fixtures/certificate.pfx',
            certificatePassword: 'test'
          }
        }, done)
      })

      after(function (done) {
        rimraf(dest, done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        fs.access(dest + 'RELEASES', done)
      })

      it('generates a `.nupkg` package', function (done) {
        fs.access(dest + 'bartest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        fs.access(dest + 'bartest-0.0.1-installer.exe', done)
      })

      it('generates a `.msi` package', function (done) {
        fs.access(dest + 'bartest-0.0.1-installer.msi', done)
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
        installer({
          src: 'test/fixtures/app-with-asar/',
          dest: dest,
          rename: function (dest, src) {
            var ext = path.extname(src)
            if (ext === '.exe' || ext === '.msi') {
              src = '<%= name %>-<%= version %>-installer' + ext
            }
            return path.join(dest, src)
          },

          options: {
            productDescription: 'Just a test.',
            remoteReleases: 'http://localhost:3000/foo/'
          }
        }, done)
      })

      after(function (done) {
        rimraf(dest, done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        fs.access(dest + 'RELEASES', done)
      })

      it('does not generate a delta `.nupkg` package', function (done) {
        fs.access(dest + 'footest-0.0.1-delta.nupkg', function (err) {
          done(!err)
        })
      })

      it('generates a full `.nupkg` package', function (done) {
        fs.access(dest + 'footest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        fs.access(dest + 'footest-0.0.1-installer.exe', done)
      })

      if (process.platform === 'win32') {
        it('generates a `.msi` package', function (done) {
          fs.access(dest + 'footest-0.0.1-installer.msi', done)
        })
      }
    })

    describe('with an app without asar with an old remote release', function (test) {
      var dest = 'test/fixtures/out/bar/'

      before(function (done) {
        installer({
          src: 'test/fixtures/app-without-asar/',
          dest: dest,
          rename: function (dest, src) {
            var ext = path.extname(src)
            if (ext === '.exe' || ext === '.msi') {
              src = '<%= name %>-<%= version %>-installer' + ext
            }
            return path.join(dest, src)
          },

          options: {
            productDescription: 'Just a test.',
            remoteReleases: 'http://localhost:3000/bar/'
          }
        }, done)
      })

      after(function (done) {
        rimraf(dest, done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        fs.access(dest + 'RELEASES', done)
      })

      it('generates a delta `.nupkg` package', function (done) {
        fs.access(dest + 'bartest-0.0.1-delta.nupkg', done)
      })

      it('generates a full `.nupkg` package', function (done) {
        fs.access(dest + 'bartest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        fs.access(dest + 'bartest-0.0.1-installer.exe', done)
      })

      if (process.platform === 'win32') {
        it('generates a `.msi` package', function (done) {
          fs.access(dest + 'bartest-0.0.1-installer.msi', done)
        })
      }
    })
  })
})
