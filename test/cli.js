'use strict'

var fs = require('fs')
var child = require('child_process')

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
  this.timeout(20000)

  describe('with an app with asar', function (test) {
    before(function (done) {
      spawn('node src/cli.js', [
        '--src', 'test/fixtures/app-with-asar/',
        '--dest', 'test/fixtures/out/foo/'
      ], done)
    })

    it('generates a `RELEASES` manifest', function (done) {
      fs.access('test/fixtures/out/foo/RELEASES', done)
    })

    it('generates a `.nupkg` package', function (done) {
      fs.access('test/fixtures/out/foo/footest-0.0.1-full.nupkg', done)
    })

    it('generates a `.exe` package', function (done) {
      fs.access('test/fixtures/out/foo/footest-0.0.1-setup.exe', done)
    })

    if (process.platform === 'win32') {
      it('generates a `.msi` package', function (done) {
        fs.access('test/fixtures/out/foo/footest-0.0.1-setup.msi', done)
      })
    }
  })

  describe('with an app without asar', function (test) {
    before(function (done) {
      spawn('node src/cli.js', [
        '--src', 'test/fixtures/app-without-asar/',
        '--dest', 'test/fixtures/out/bar/'
      ], done)
    })

    it('generates a `RELEASES` manifest', function (done) {
      fs.access('test/fixtures/out/bar/RELEASES', done)
    })

    it('generates a `.nupkg` package', function (done) {
      fs.access('test/fixtures/out/bar/bartest-0.0.1-full.nupkg', done)
    })

    it('generates a `.exe` package', function (done) {
      fs.access('test/fixtures/out/bar/bartest-0.0.1-setup.exe', done)
    })

    if (process.platform === 'win32') {
      it('generates a `.msi` package', function (done) {
        fs.access('test/fixtures/out/bar/bartest-0.0.1-setup.msi', done)
      })
    }
  })

  if (process.platform === 'win32') {
    describe('with a signed app with asar', function (test) {
      before(function (done) {
        spawn('node src/cli.js', [
          '--src', 'test/fixtures/app-with-asar/',
          '--dest', 'test/fixtures/out/foo/',
          '--certificateFile', 'test/fixtures/certificate.pfx',
          '--certificatePassword', 'test'
        ], done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        fs.access('test/fixtures/out/foo/RELEASES', done)
      })

      it('generates a `.nupkg` package', function (done) {
        fs.access('test/fixtures/out/foo/footest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        fs.access('test/fixtures/out/foo/footest-0.0.1-setup.exe', done)
      })

      it('generates a `.msi` package', function (done) {
        fs.access('test/fixtures/out/foo/footest-0.0.1-setup.msi', done)
      })
    })

    describe('with a signed app without asar', function (test) {
      before(function (done) {
        spawn('node src/cli.js', [
          '--src', 'test/fixtures/app-without-asar/',
          '--dest', 'test/fixtures/out/bar/',
          '--certificateFile', 'test/fixtures/certificate.pfx',
          '--certificatePassword', 'test'
        ], done)
      })

      it('generates a `RELEASES` manifest', function (done) {
        fs.access('test/fixtures/out/bar/RELEASES', done)
      })

      it('generates a `.nupkg` package', function (done) {
        fs.access('test/fixtures/out/bar/bartest-0.0.1-full.nupkg', done)
      })

      it('generates a `.exe` package', function (done) {
        fs.access('test/fixtures/out/bar/bartest-0.0.1-setup.exe', done)
      })

      it('generates a `.msi` package', function (done) {
        fs.access('test/fixtures/out/bar/bartest-0.0.1-setup.msi', done)
      })
    })
  }
})
