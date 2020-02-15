'use strict'

const chai = require('chai')
const spawn = require('../src/spawn')

describe('spawn', () => {
  let oldPath

  before(() => {
    oldPath = process.env.PATH
    process.env.PATH = '/non-existent-path'
  })

  it('should throw a human-friendly error when it cannot find mono', async () => {
    try {
      let cmd = 'mono'
      let args = ['--version']
      if (process.platform !== 'win32') {
        cmd = '--version'
        args = []
      }
      await spawn(cmd, args, msg => { })
      throw new Error('mono should not have been executed')
    } catch (error) {
      chai.expect(error.message).to.match(/Error executing command \(mono --version\):\nYour system is missing the mono/)
    }
  })

  after(() => {
    process.env.PATH = oldPath
  })
})
