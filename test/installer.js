'use strict'

var installer = require('..')

var path = require('path')
var chai = require('chai')
var chaiFs = require('./helpers/fs')
var expect = chai.expect
chai.use(chaiFs)

describe('module', function () {
  this.timeout(10000)

  describe('with an app with asar', function (test) {
    beforeEach(function (done) {
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

    it('generates `.exe` and `.nupkg` packages', function () {
      expect('test/fixtures/out/footest-0.0.1-installer.exe').to.exist
      expect('test/fixtures/out/footest-0.0.1-full.nupkg').to.exist
    })
  })

  describe('with an app without asar', function (test) {
    beforeEach(function (done) {
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

    it('generates `.exe` and `.nupkg` packages', function () {
      expect('test/fixtures/out/bartest-0.0.1-installer.exe').to.exist
      expect('test/fixtures/out/bartest-0.0.1-full.nupkg').to.exist
    })
  })
})
