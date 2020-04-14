'use strict'

const test = require('ava')
const spawn = require('../src/spawn')

test.before(t => {
  t.context.oldPath = process.env.PATH
  process.env.PATH = '/non-existent-path'
})

test.after.always(t => {
  process.env.PATH = t.context.oldPath
})

test('should throw a human-friendly error when it cannot find mono', async t => {
  let cmd = 'mono'
  let args = ['--version']
  if (process.platform !== 'win32') {
    cmd = '--version'
    args = []
  }
  await t.throwsAsync(
    spawn(cmd, args, msg => { }),
    { message: /Error executing command \(mono --version\):\nYour system is missing the mono/ }
  )
})
