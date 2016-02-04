'use strict'

var installer = require('..')

var fs = require('fs')
var path = require('path')

describe('module', function () {
  this.timeout(20000)

  describe('with an app with asar', function (test) {
    before(function (done) {
      installer({
        src: 'test/fixtures/app-with-asar/',
        dest: 'test/fixtures/out/',
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

    it('generates a `.nupkg` package', function (done) {
      fs.access('test/fixtures/out/footest-0.0.1-full.nupkg', done)
    })

    it('generates a `.exe` package', function (done) {
      fs.access('test/fixtures/out/footest-0.0.1-installer.exe', done)
    })

    if (process.platform === 'win32') {
      it('generates a `.msi` package', function (done) {
        fs.access('test/fixtures/out/footest-0.0.1-installer.msi', done)
      })
    }
  })

  describe('with an app without asar', function (test) {
    before(function (done) {
      installer({
        src: 'test/fixtures/app-without-asar/',
        dest: 'test/fixtures/out/',
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

    it('generates a `.nupkg` package', function (done) {
      fs.access('test/fixtures/out/bartest-0.0.1-full.nupkg', done)
    })

    it('generates a `.exe` package', function (done) {
      fs.access('test/fixtures/out/bartest-0.0.1-installer.exe', done)
    })

    if (process.platform === 'win32') {
      it('generates a `.msi` package', function (done) {
        fs.access('test/fixtures/out/bartest-0.0.1-installer.msi', done)
      })
    }
  })

  if (process.platform === 'win32') {
    describe('with a signed app with asar', function (test) {
      before(function (done) {
        installer({
          src: 'test/fixtures/app-with-asar/',
          dest: 'test/fixtures/out/',
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

      it('generates a `.nupkg` package', function (done) {
        fs.access('test/fixtures/out/footest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        fs.access('test/fixtures/out/footest-0.0.1-installer.exe', done)
      })

      it('generates a `.msi` package', function (done) {
        fs.access('test/fixtures/out/footest-0.0.1-installer.msi', done)
      })
    })

    describe('with a signed app without asar', function (test) {
      before(function (done) {
        installer({
          src: 'test/fixtures/app-without-asar/',
          dest: 'test/fixtures/out/',
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

      it('generates a `.nupkg` package', function (done) {
        fs.access('test/fixtures/out/bartest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        fs.access('test/fixtures/out/bartest-0.0.1-installer.exe', done)
      })

      it('generates a `.msi` package', function (done) {
        fs.access('test/fixtures/out/bartest-0.0.1-installer.msi', done)
      })
    })
  }
})
