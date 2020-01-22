'use strict'

const common = require('electron-installer-common')
const debug = require('debug')
const fs = require('fs-extra')
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
   * Transforms a version string from semver v2 into v1
   */
  convertVersion () {
    const [mainVersion, ...suffix] = this.options.version.split('-')

    if (suffix.length > 0) {
      this.options.version = [mainVersion, suffix.join('-').replace(/\./g, '')].join('-')
    } else {
      this.options.version = mainVersion
    }
  }

  /**
   * Copy the application into the package.
   */
  async copyApplication () {
    await super.copyApplication()
    if (this.options.iconNuget) {
      const iconNuget = path.join(this.stagingAppDir, this.options.iconNugetName)
      await super.copyIcon(this.options.iconNuget, iconNuget)
    }
    return this.copySquirrelUpdater()
  }

  copySquirrelUpdater () {
    const updateSrc = path.join(this.vendorDir, 'squirrel', 'Squirrel.exe')
    const updateDest = path.join(this.stagingAppDir, 'Update.exe')
    return common.wrapError('copying Squirrel updater', async () => fs.copy(updateSrc, updateDest))
  }

  /**
   * Package everything using `nuget`.
   */
  createPackage () {
    this.options.logger(`Creating package at ${this.stagingDir}`)

    const cmd = path.join(this.vendorDir, 'nuget', 'nuget.exe')
    const args = [
      'pack', this.specPath,
      '-BasePath', this.stagingAppDir,
      '-OutputDirectory', path.join(this.stagingDir, 'nuget'),
      '-NoDefaultExcludes'
    ]

    return common.wrapError('creating package with NuGet', async () => spawn(cmd, args, this.options.logger))
  }

  /**
   * Create the nuspec file for the package.
   *
   * See: https://docs.nuget.org/create/nuspec-reference
   */
  createSpec () {
    const src = path.resolve(__dirname, '../resources/spec.ejs')
    this.options.logger(`Creating spec file at ${this.specPath}`)

    return common.wrapError('creating spec file', async () => this.createTemplatedFile(src, this.specPath))
  }

  /**
   * Get the hash of default options for the installer. Some come from the info
   * read from `package.json`, and some are hardcoded.
   */
  async generateDefaults () {
    const pkg = (await common.readMetadata(this.userSupplied)) || {}

    const authors = pkg.author ? [typeof pkg.author === 'string' ? parseAuthor(pkg.author).name : pkg.author.name] : undefined

    this.defaults = Object.assign(common.getDefaultsFromPackageJSON(pkg), {
      version: pkg.version || '0.0.0',

      copyright: pkg.copyright || (authors && `Copyright \u00A9 ${new Date().getFullYear()} ${authors.join(', ')}`),
      authors: authors,
      owners: authors,

      exe: pkg.name ? `${pkg.name}.exe` : 'electron.exe',
      icon: path.resolve(__dirname, '../resources/icon.ico'),
      animation: path.resolve(__dirname, '../resources/animation.gif'),

      iconNuget: undefined,

      tags: [],

      certificateFile: undefined,
      certificatePassword: undefined,
      signWithParams: undefined,

      remoteReleases: undefined,

      noMsi: false
    })

    return this.defaults
  }

  /**
   * Flattens and merges default values, CLI-supplied options, and API-supplied options.
   */
  generateOptions () {
    super.generateOptions()

    this.options.name = common.sanitizeName(this.options.name, 'a-zA-Z0-9', '_')

    this.convertVersion()

    if (this.options.iconNuget) this.options.iconNugetName = path.basename(this.options.iconNuget)

    if (!this.options.description) {
      throw new Error("No Description provided. Please set a description in the app's package.json or provide it in the this.options.")
    }

    if (!this.options.authors) {
      throw new Error("No Authors provided. Please set an author in the app's package.json or provide it in the this.options.")
    }

    return this.options
  }

  /**
   * Releasify everything using `squirrel`.
   */
  async releasifyPackage () {
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
        `/p "${this.options.certificatePassword}"`,
        `/d "${this.options.productName}"`
      ].join(' '))
    }

    if (this.options.noMsi) {
      args.push('--no-msi')
    }

    return common.wrapError('releasifying package', async () => {
      const pkg = path.join(this.stagingDir, 'nuget', `${this.options.name}.${this.options.version}.nupkg`)
      args.unshift('--releasify', pkg)
      return spawn(cmd, args, this.options.logger)
    })
  }

  /**
   * Sync remote releases.
   */
  async syncRemoteReleases () {
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

    return common.wrapError('syncing remote releases', async () => {
      await fs.ensureDir(this.squirrelDir, '0755')
      return spawn(cmd, args, this.options.logger)
    })
  }
}

/* ************************************************************************** */

module.exports = async data => {
  data.rename = data.rename || defaultRename
  data.logger = data.logger || defaultLogger

  const installer = new SquirrelInstaller(data)

  await installer.generateDefaults()
  await installer.generateOptions()
  data.logger(`Creating package with options\n${JSON.stringify(installer.options, null, 2)}`)
  await installer.createStagingDir()
  await installer.createContents()
  await installer.createPackage()
  await installer.syncRemoteReleases()
  await installer.releasifyPackage()
  await installer.movePackage()
  data.logger(`Successfully created package at ${installer.options.dest}`)
  return installer.options
}

module.exports.Installer = SquirrelInstaller
