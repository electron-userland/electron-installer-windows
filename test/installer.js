'use strict'

const chai = require('chai')
const fs = require('fs-extra')
const path = require('path')
const access = require('./helpers/access')
const serve = require('./helpers/serve')

const installer = require('..')

describe('module', function () {
  this.timeout(20000)

  describe('with an app with asar', function (test) {
    const dest = 'test/fixtures/out/foo/'

    before(function () {
      return installer({
        src: 'test/fixtures/app-with-asar/',
        dest: dest,
        rename: function (dest, src) {
          const ext = path.extname(src)
          if (ext === '.exe' || ext === '.msi') {
            src = '<%= name %>-<%= version %>-installer' + ext
          }
          return path.join(dest, src)
        },

        options: {
          productDescription: 'Just a test.'
        }
      })
    })

    after(() => fs.remove(dest))

    it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

    it('generates a `.nupkg` package', () => access(dest + 'footest-0.0.1-full.nupkg'))

    it('generates a `.exe` package', () => access(dest + 'footest-0.0.1-installer.exe'))

    if (process.platform === 'win32') {
      it('generates a `.msi` package', () => access(dest + 'footest-0.0.1-installer.msi'))
    }
  })

  describe('with an app without asar', function (test) {
    const dest = 'test/fixtures/out/bar/'

    before(() => {
      return installer({
        src: 'test/fixtures/app-without-asar/',
        dest: dest,
        rename: function (dest, src) {
          const ext = path.extname(src)
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
      })
    })

    after(() => fs.remove(dest))

    it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

    it('generates a `.nupkg` package', () => access(dest + 'bartest-0.0.1-full.nupkg'))

    it('generates a `.exe` package', () => access(dest + 'bartest-0.0.1-installer.exe'))

    if (process.platform === 'win32') {
      it('generates a `.msi` package', () => access(dest + 'bartest-0.0.1-installer.msi'))
    }
  })

  // Signing only works on Win32.
  if (process.platform === 'win32') {
    describe('with a signed app with asar', function (test) {
      const dest = 'test/fixtures/out/foo/'

      before(() => {
        return installer({
          src: 'test/fixtures/app-with-asar/',
          dest: dest,
          rename: function (dest, src) {
            const ext = path.extname(src)
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
        })
      })

      after(() => fs.remove(dest))

      it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

      it('generates a `.nupkg` package', () => access(dest + 'footest-0.0.1-full.nupkg'))

      it('generates a `.exe` package', () => access(dest + 'footest-0.0.1-installer.exe'))

      it('generates a `.msi` package', () => access(dest + 'footest-0.0.1-installer.msi'))
    })

    describe('with a signed app without asar', function (test) {
      const dest = 'test/fixtures/out/bar/'

      before(() => {
        return installer({
          src: 'test/fixtures/app-without-asar/',
          dest: dest,
          rename: function (dest, src) {
            const ext = path.extname(src)
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
        })
      })

      after(() => fs.remove(dest))

      it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

      it('generates a `.nupkg` package', () => access(dest + 'bartest-0.0.1-full.nupkg'))

      it('generates a `.exe` package', () => access(dest + 'bartest-0.0.1-installer.exe'))

      it('generates a `.msi` package', () => access(dest + 'bartest-0.0.1-installer.msi'))
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

      before(() => {
        return installer({
          src: 'test/fixtures/app-with-asar/',
          dest: dest,
          rename: function (dest, src) {
            const ext = path.extname(src)
            if (ext === '.exe' || ext === '.msi') {
              src = '<%= name %>-<%= version %>-installer' + ext
            }
            return path.join(dest, src)
          },

          options: {
            productDescription: 'Just a test.',
            remoteReleases: 'http://localhost:3000/foo/'
          }
        })
      })

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

      it('generates a `.exe` package', () => access(dest + 'footest-0.0.1-installer.exe'))

      if (process.platform === 'win32') {
        it('generates a `.msi` package', () => access(dest + 'footest-0.0.1-installer.msi'))
      }
    })

    describe('with an app without asar with an old remote release', function (test) {
      const dest = 'test/fixtures/out/bar/'

      before(() => {
        return installer({
          src: 'test/fixtures/app-without-asar/',
          dest: dest,
          rename: function (dest, src) {
            const ext = path.extname(src)
            if (ext === '.exe' || ext === '.msi') {
              src = '<%= name %>-<%= version %>-installer' + ext
            }
            return path.join(dest, src)
          },

          options: {
            productDescription: 'Just a test.',
            remoteReleases: 'http://localhost:3000/bar/'
          }
        })
      })

      after(() => fs.remove(dest))

      it('generates a `RELEASES` manifest', () => access(dest + 'RELEASES'))

      it('generates a delta `.nupkg` package', () => access(dest + 'bartest-0.0.1-delta.nupkg'))

      it('generates a full `.nupkg` package', () => access(dest + 'bartest-0.0.1-full.nupkg'))

      it('generates a `.exe` package', () => access(dest + 'bartest-0.0.1-installer.exe'))

      if (process.platform === 'win32') {
        it('generates a `.msi` package', () => access(dest + 'bartest-0.0.1-installer.msi'))
      }
    })
  })
})
