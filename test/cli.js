'use strict'

var child = require('child_process')

var chai = require('chai')
var chaiFs = require('./helpers/fs')
var expect = chai.expect
chai.use(chaiFs)

var spawn = function (cmd, args, callback) {
  var cmds = cmd.split(' ')
  var spawnedProcess = null
  var error = null
  var stderr = ''

  try {
    spawnedProcess = child.spawn(cmds[0], cmds.slice(1).concat(args))
  } catch (err) {
    process.nextTick(function () {
      callback(err, stderr)
    })
    return
  }

  spawnedProcess.stderr.on('data', function (data) {
    stderr += data
  })

  spawnedProcess.on('error', function (err) {
    error = error || err
  })

  spawnedProcess.on('close', function (code, signal) {
    if (code !== 0) {
      error = error || signal || code
    }

    callback(error && new Error('Error executing command (' + (error.message || error) + '): ' +
      '\n' + cmd + ' ' + args.join(' ') + '\n' + stderr))
  })
}

describe('cli', function () {
  this.timeout(10000)

  describe('with an app with asar', function (test) {
    beforeEach(function (done) {
      spawn('node src/cli.js', [
        '--src', 'test/fixtures/app-with-asar/',
        '--dest', 'test/fixtures/out/foo/'
      ], done)
    })

    it('generates `.exe` and `.nupkg` packages', function () {
      expect('test/fixtures/out/foo/footest-0.0.1-setup.exe').to.exist
      expect('test/fixtures/out/foo/footest-0.0.1-full.nupkg').to.exist
      expect('test/fixtures/out/foo/RELEASES').to.exist
    })
  })

  describe('with an app without asar', function (test) {
    beforeEach(function (done) {
      spawn('node src/cli.js', [
        '--src', 'test/fixtures/app-without-asar/',
        '--dest', 'test/fixtures/out/bar/'
      ], done)
    })

    it('generates `.exe` and `.nupkg` packages', function () {
      expect('test/fixtures/out/bar/bartest-0.0.1-setup.exe').to.exist
      expect('test/fixtures/out/bar/bartest-0.0.1-full.nupkg').to.exist
      expect('test/fixtures/out/bar/RELEASES').to.exist
    })
  })
})
