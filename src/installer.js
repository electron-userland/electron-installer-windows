'use strict'

const _ = require('lodash')
const common = require('electron-installer-common')
const debug = require('debug')
const fs = require('fs-extra')
const glob = require('glob-promise')
const nodeify = require('nodeify')
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

/**
 * Get the hash of default options for the installer. Some come from the info
 * read from `package.json`, and some are hardcoded.
 */
function getDefaults (data) {
  return common.readMeta(data)
    .then(pkg => {
      pkg = pkg || {}
      const authors = pkg.author && [(typeof pkg.author === 'string'
        ? pkg.author.replace(/\s+(<[^>]+>|\([^)]+\))/g, '')
        : pkg.author.name
      )]

      return Object.assign(common.getDefaultsFromPackageJSON(pkg), {
        version: pkg.version || '0.0.0',

        copyright: pkg.copyright || (authors && `Copyright \u00A9 ${new Date().getFullYear()} ${authors}`),
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
    })
}

/**
 * Get the hash of options for the installer.
 */
function getOptions (data, defaults) {
  // Flatten everything for ease of use.
  const options = _.defaults({}, data, data.options, defaults)

  return options
}

/**
 * Create the nuspec file for the package.
 *
 * See: https://docs.nuget.org/create/nuspec-reference
 */
function createSpec (options, dir) {
  const specSrc = path.resolve(__dirname, '../resources/spec.ejs')
  const specDest = path.join(dir, 'nuget', `${options.name}.nuspec`)
  options.logger(`Creating spec file at ${specDest}`)

  return common.generateTemplate(options, specSrc)
    .then(data => fs.outputFile(specDest, data))
    .catch(common.wrapError('creating spec file'))
}

/**
 * Copy the application into the package.
 */
function createApplication (options, dir) {
  const applicationDir = path.join(dir, options.name)
  const updateSrc = path.resolve(__dirname, '../vendor/squirrel/Squirrel.exe')
  const updateDest = path.join(applicationDir, 'Update.exe')
  options.logger(`Copying application to ${applicationDir}`)

  return fs.copy(options.src, applicationDir)
    .then(() => fs.copy(updateSrc, updateDest))
    .catch(common.wrapError('copying application directory'))
}

/**
 * Create subdirectories where intermediate files will live.
 */
function createSubdirs (options, dir) {
  options.logger(`Creating subdirectories under ${dir}`)

  return fs.ensureDir(path.join(dir, 'nuget'))
    .then(() => fs.ensureDir(path.join(dir, 'squirrel')))
    .then(() => dir)
    .catch(common.wrapError('creating temporary subdirectories'))
}

/**
 * Create the contents of the package.
 */
function createContents (options, dir) {
  return common.createContents(options, dir, [
    createSpec,
    createApplication
  ])
}

/**
 * Package everything using `nuget`.
 */
function createPackage (options, dir) {
  options.logger(`Creating package at ${dir}`)

  const applicationDir = path.join(dir, options.name)
  const nugetDir = path.join(dir, 'nuget')
  const specFile = path.join(nugetDir, `${options.name}.nuspec`)

  const cmd = path.resolve(__dirname, '../vendor/nuget/nuget.exe')
  const args = [
    'pack',
    specFile,
    '-BasePath',
    applicationDir,
    '-OutputDirectory',
    nugetDir,
    '-NoDefaultExcludes'
  ]

  return spawn(cmd, args, options.logger)
    .then(() => dir)
    .catch(common.wrapError('creating package with NuGet'))
}

/**
 * Find the package just created.
 */
function findPackage (options, dir) {
  const packagePattern = path.join(dir, 'nuget', '*.nupkg')
  options.logger(`Finding package with pattern ${packagePattern}`)

  return glob(packagePattern)
    .then(files => ({
      dir: dir,
      pkg: files[0]
    })).catch(common.wrapError('finding package with pattern'))
}

/**
 * Sync remote releases.
 */
function syncRemoteReleases (options, dir, pkg) {
  if (!options.remoteReleases) {
    return { dir: dir, pkg: pkg }
  }

  options.logger(`Syncing package at ${dir}`)

  const url = options.remoteReleases
  const squirrelDir = path.join(dir, 'squirrel')

  const cmd = path.resolve(__dirname, '../vendor/squirrel/SyncReleases.exe')
  const args = [
    '--url',
    url,
    '--releaseDir',
    squirrelDir
  ]

  return spawn(cmd, args, options.logger)
    .then(() => ({
      dir: dir,
      pkg: pkg
    })).catch(common.wrapError('syncing remote releases'))
}

/**
 * Releasify everything using `squirrel`.
 */
function releasifyPackage (options, dir, pkg) {
  options.logger(`Releasifying package at ${dir}`)

  const squirrelDir = path.join(dir, 'squirrel')

  const cmd = path.resolve(__dirname, '../vendor/squirrel/' +
    (process.platform === 'win32' ? 'Squirrel.com' : 'Squirrel-Mono.exe'))
  const args = [
    '--releasify',
    pkg,
    '--releaseDir',
    squirrelDir
  ]

  if (options.icon) {
    args.push('--setupIcon')
    args.push(path.resolve(options.icon))
  }

  if (options.animation) {
    args.push('--loadingGif')
    args.push(path.resolve(options.animation))
  }

  if (options.signWithParams) {
    args.push('--signWithParams')
    args.push(options.signWithParams)
  } else if (options.certificateFile && options.certificatePassword) {
    args.push('--signWithParams')
    args.push([
      '/a',
      `/f "${path.resolve(options.certificateFile)}"`,
      `/p "${options.certificatePassword}"`
    ].join(' '))
  }

  if (options.noMsi) {
    args.push('--no-msi')
  }

  return spawn(cmd, args, options.logger)
    .then(() => dir)
    .catch(common.wrapError('releasifying package'))
}

/**
 * Move the package files to the specified destination.
 */
function movePackage (options, dir) {
  const packagePattern = path.join(dir, 'squirrel', '*')

  common.movePackage(packagePattern, options, dir)
}

/* ************************************************************************** */

module.exports = function (data, callback) {
  data.rename = data.rename || defaultRename
  data.logger = data.logger || defaultLogger

  let options

  const promise = getDefaults(data)
    .then(defaults => getOptions(data, defaults))
    .then(generatedOptions => {
      options = generatedOptions
      return data.logger(`Creating package with options\n${JSON.stringify(options, null, 2)}`)
    }).then(() => common.createDir(options))
    .then(dir => createSubdirs(options, dir))
    .then(dir => createContents(options, dir))
    .then(dir => createPackage(options, dir))
    .then(dir => findPackage(options, dir))
    .then(data => syncRemoteReleases(options, data.dir, data.pkg))
    .then(data => releasifyPackage(options, data.dir, data.pkg))
    .then(dir => movePackage(options, dir))
    .then(() => {
      data.logger(`Successfully created package at ${options.dest}`)
      return options
    }).catch(err => {
      data.logger(common.errorMessage('creating package', err))
      throw err
    })

  return nodeify(promise, callback)
}
