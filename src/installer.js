'use strict'

const common = require('electron-installer-common')
const debug = require('debug')
const fs = require('fs-extra')
const glob = require('glob-promise')
const nodeify = require('nodeify')
const parseAuthor = require('parse-author')
const path = require('path')

const spawn = require('./spawn')

debug.log = console.info.bind(console)
const defaultLogger = debug('electron-installer-windows')

function defaultRename (dest, src) {
  const ext = path.extname(src)
  if (ext === '.exe' || ext === '.msi') {
    src = `<%= name %>-<%= version %>-setup${ext}`
  }
  return path.join(dest, src)
}

class SquirrelInstaller extends common.ElectronInstaller {
  get contentFunctions () {
    return [
      'copyApplication',
      'createSpec'
    ]
  }

  get packagePattern () {
    return path.join(this.squirrelDir, '*')
  }

  get specPath () {
    return path.join(this.stagingDir, 'nuget', `${this.options.name}.nuspec`)
  }

  get squirrelDir () {
    return path.join(this.stagingDir, 'squirrel')
  }

  get stagingAppDir () {
    return path.join(this.stagingDir, this.appIdentifier)
  }

  get vendorDir () {
    return path.resolve(__dirname, '../vendor')
  }

  /**
   * Copy the application into the package.
   */
  copyApplication () {
    return super.copyApplication()
      .then(() => this.copySquirrelUpdater())
  }

  copySquirrelUpdater () {
    const updateSrc = path.join(this.vendorDir, 'squirrel', 'Squirrel.exe')
    const updateDest = path.join(this.stagingAppDir, 'Update.exe')
    return fs.copy(updateSrc, updateDest)
      .catch(common.wrapError('copying Squirrel updater'))
  }

  /**
   * Package everything using `nuget`.
   */
  createPackage () {
    this.options.logger(`Creating package at ${this.stagingDir}`)

    const cmd = path.join(this.vendorDir, 'nuget', 'nuget.exe')
    const args = [
      'pack',
      this.specPath,
      '-BasePath',
      this.stagingAppDir,
      '-OutputDirectory',
      path.join(this.stagingDir, 'nuget'),
      '-NoDefaultExcludes'
    ]

    return spawn(cmd, args, this.options.logger)
      .catch(common.wrapError('creating package with NuGet'))
  }

  /**
   * Create the nuspec file for the package.
   *
   * See: https://docs.nuget.org/create/nuspec-reference
   */
  createSpec () {
    const src = path.resolve(__dirname, '../resources/spec.ejs')
    this.options.logger(`Creating spec file at ${this.specPath}`)

    return this.createTemplatedFile(src, this.specPath)
      .catch(common.wrapError('creating spec file'))
  }

  /**
   * Find the package just created.
   */
  findPackage () {
    const packagePattern = path.join(this.stagingDir, 'nuget', '*.nupkg')
    this.options.logger(`Finding package with pattern ${packagePattern}`)

    return glob(packagePattern)
      .then(files => files[0])
      .catch(common.wrapError('finding package with pattern'))
  }

  /**
   * Get the hash of default options for the installer. Some come from the info
   * read from `package.json`, and some are hardcoded.
   */
  generateDefaults () {
    return common.readMetadata(this.userSupplied)
      .then(pkg => {
        pkg = pkg || {}
        const authors = [parseAuthor(pkg.author).name]

        this.defaults = Object.assign(common.getDefaultsFromPackageJSON(pkg), {
          version: pkg.version || '0.0.0',

          copyright: pkg.copyright || (authors && `Copyright \u00A9 ${new Date().getFullYear()} ${authors.join(', ')}`),
          authors: authors,
          owners: authors,

          exe: pkg.name ? `${pkg.name}.exe` : 'electron.exe',
          icon: path.resolve(__dirname, '../resources/icon.ico'),
          animation: path.resolve(__dirname, '../resources/animation.gif'),

          iconUrl: undefined,
          licenseUrl: undefined,
          requireLicenseAcceptance: false,

          tags: [],

          certificateFile: undefined,
          certificatePassword: undefined,
          signWithParams: undefined,

          remoteReleases: undefined,

          noMsi: false
        })

        return this.defaults
      })
  }

  /**
   * Releasify everything using `squirrel`.
   */
  releasifyPackage () {
    this.options.logger(`Releasifying package at ${this.stagingDir}`)

    const cmd = path.join(this.vendorDir, 'squirrel', process.platform === 'win32' ? 'Squirrel.com' : 'Squirrel-Mono.exe')
    const args = [
      '--releaseDir',
      this.squirrelDir
    ]

    if (this.options.icon) {
      args.push('--setupIcon', path.resolve(this.options.icon))
    }

    if (this.options.animation) {
      args.push('--loadingGif', path.resolve(this.options.animation))
    }

    if (this.options.signWithParams) {
      args.push('--signWithParams', this.options.signWithParams)
    } else if (this.options.certificateFile && this.options.certificatePassword) {
      args.push('--signWithParams', [
        '/a',
        `/f "${path.resolve(this.options.certificateFile)}"`,
        `/p "${this.options.certificatePassword}"`
      ].join(' '))
    }

    if (this.options.noMsi) {
      args.push('--no-msi')
    }

    return this.findPackage()
      .then(pkg => {
        args.unshift('--releasify', pkg)
        return spawn(cmd, args, this.options.logger)
      }).catch(common.wrapError('releasifying package'))
  }

  /**
   * Sync remote releases.
   */
  syncRemoteReleases () {
    if (!this.options.remoteReleases) {
      return
    }

    this.options.logger(`Syncing package at ${this.stagingDir}`)

    const cmd = path.join(this.vendorDir, 'squirrel', 'SyncReleases.exe')
    const args = [
      '--url',
      this.options.remoteReleases,
      '--releaseDir',
      this.squirrelDir
    ]

    return fs.ensureDir(this.squirrelDir, '0755')
      .then(() => spawn(cmd, args, this.options.logger))
      .catch(common.wrapError('syncing remote releases'))
  }
}

/* ************************************************************************** */

module.exports = (data, callback) => {
  data.rename = data.rename || defaultRename
  data.logger = data.logger || defaultLogger

  if (callback) {
    console.warn('The node-style callback is deprecated. In a future major version, it will be' +
                 'removed in favor of a Promise-based async style.')
  }

  const installer = new SquirrelInstaller(data)

  const promise = installer.generateDefaults()
    .then(() => installer.generateOptions())
    .then(() => data.logger(`Creating package with options\n${JSON.stringify(installer.options, null, 2)}`))
    .then(() => installer.createStagingDir())
    .then(() => installer.createContents())
    .then(() => installer.createPackage())
    .then(() => installer.syncRemoteReleases())
    .then(() => installer.releasifyPackage())
    .then(() => installer.movePackage())
    .then(() => {
      data.logger(`Successfully created package at ${installer.options.dest}`)
      return installer.options
    }).catch(err => {
      data.logger(common.errorMessage('creating package', err))
      throw err
    })

  return nodeify(promise, callback)
}

module.exports.Installer = SquirrelInstaller
