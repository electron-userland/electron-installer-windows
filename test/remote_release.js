const test = require('ava')
const describeCLI = require('./helpers/_describe_cli')
const describeInstaller = require('./helpers/_describe_installer')
const Server = require('./helpers/_server')

test.before(async t => {
  t.context.server = new Server('test/fixtures/releases/', 3000)
  await t.context.server.runServer()
})

test.after.always(async t => {
  await t.context.server.closeServer()
})

describeCLI(test, 'cli - with an app with asar with the same remote release', true, {
  remoteReleases: 'http://localhost:3000/foo/'
})

describeCLI(test, 'cli - with an app without asar with an old remote release', false, {
  remoteReleases: 'http://localhost:3000/bar/'
})

describeInstaller(test, 'installer - with an app with asar with the same remote release', true, {
  remoteReleases: 'http://localhost:3000/foo/'
})

describeInstaller(test, 'installer - with an app without asar with an old remote release', false, {
  remoteReleases: 'http://localhost:3000/bar/'
})
