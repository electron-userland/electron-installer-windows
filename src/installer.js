'use strict'

const _ = require('lodash')
const asar = require('asar')
const debug = require('debug')
const fs = require('fs-extra')
const glob = require('glob-promise')
const nodeify = require('nodeify')
const path = require('path')
const tmp = require('tmp-promise')

const spawn = require('./spawn')

debug.log = console.info.bind(console)
const defaultLogger = debug('electron-installer-windows')

const defaultRename = function (dest, src) {
  const ext = path.extname(src)
  if (ext === '.exe' || ext === '.msi') {
    src = '<%= name %>-<%= version %>-setup' + ext
  }
  return path.join(dest, src)
}

function errorMessage (message, err) {
  return `Error ${message}: ${err.message || err}`
}

function wrapError (message) {
  return err => {
    throw new Error(errorMessage(message, err))
  }
}

/**
 * Read `package.json` either from `resources.app.asar` (if the app is packaged)
 * or from `resources/app/package.json` (if it is not).
 */
function readMeta (options) {
  const appAsarPath = path.join(options.src, 'resources/app.asar')
  const appPackageJSONPath = path.join(options.src, 'resources/app/package.json')

  return fs.pathExists(appAsarPath)
    .then(assarExists => {
      if (assarExists) {
        options.logger('Reading package metadata from ' + appAsarPath)
        return JSON.parse(asar.extractFile(appAsarPath, 'package.json'))
      } else {
        options.logger('Reading package metadata from ' + appPackageJSONPath)
        return fs.readJsonSync(appPackageJSONPath)
      }
    }).catch(wrapError('reading package metadata'))
}

/**
 * Get the hash of default options for the installer. Some come from the info
 * read from `package.json`, and some are hardcoded.
 */
function getDefaults (data) {
  return readMeta(data)
    .then(pkg => {
      pkg = pkg || {}
      const authors = pkg.author && [(typeof pkg.author === 'string'
        ? pkg.author.replace(/\s+(<[^>]+>|\([^)]+\))/g, '')
        : pkg.author.name
      )]

      const urlRegex = /.*\(([^)]+)\).*/
      const authorURL = typeof pkg.author === 'string' && pkg.author.search(urlRegex) >= 0
        ? pkg.author.replace(urlRegex, '$1')
        : pkg.author.url

      return {
        name: pkg.name || 'electron',
        productName: pkg.productName || pkg.name,
        description: pkg.description,
        productDescription: pkg.productDescription || pkg.description,
        version: pkg.version || '0.0.0',

        copyright: pkg.copyright || (authors && 'Copyright \u00A9 ' + new Date().getFullYear() + ' ' + authors),
        authors: authors,
        owners: authors,

        homepage: pkg.homepage || authorURL,

        exe: pkg.name ? (pkg.name + '.exe') : 'electron.exe',
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
      }
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
 * Fill in a template with the hash of options.
 */
function generateTemplate (options, file) {
  options.logger('Generating template from ' + file)

  return fs.readFile(file)
    .then(template => {
      const result = _.template(template)(options)
      options.logger('Generated template from ' + file + '\n' + result)
      return result
    })
}

/**
 * Create the nuspec file for the package.
 *
 * See: https://docs.nuget.org/create/nuspec-reference
 */
function createSpec (options, dir) {
  const specSrc = path.resolve(__dirname, '../resources/spec.ejs')
  const specDest = path.join(dir, 'nuget', options.name + '.nuspec')
  options.logger('Creating spec file at ' + specDest)

  return generateTemplate(options, specSrc)
    .then(data => fs.outputFile(specDest, data))
    .catch(wrapError('creating spec file'))
}

/**
 * Copy the application into the package.
 */
function createApplication (options, dir) {
  const applicationDir = path.join(dir, options.name)
  const updateSrc = path.resolve(__dirname, '../vendor/squirrel/Squirrel.exe')
  const updateDest = path.join(applicationDir, 'Update.exe')
  options.logger('Copying application to ' + applicationDir)

  return fs.copy(options.src, applicationDir)
    .then(() => fs.copy(updateSrc, updateDest))
    .catch(wrapError('copying application directory'))
}

/**
 * Create temporary directory where the contents of the package will live.
 */
function createDir (options) {
  options.logger('Creating temporary directory')
  let tempDir

  return tmp.dir({prefix: 'electron-', unsafeCleanup: true})
    .then(dir => {
      tempDir = path.join(dir.path, options.name + '_' + options.version)
      return fs.ensureDir(tempDir)
    })
    .then(() => tempDir)
    .catch(wrapError('creating temporary directory'))
}

/**
 * Create subdirectories where intermediate files will live.
 */
function createSubdirs (options, dir) {
  options.logger('Creating subdirectories under ' + dir)

  return fs.ensureDir(path.join(dir, 'nuget'))
    .then(() => fs.ensureDir(path.join(dir, 'squirrel')))
    .then(() => dir)
    .catch(wrapError('creating temporary subdirectories'))
}

/**
 * Create the contents of the package.
 */
function createContents (options, dir) {
  options.logger('Creating contents of package')

  return Promise.all([
    createSpec,
    createApplication
  ].map(func => func(options, dir)))
    .then(() => dir)
    .catch(wrapError('creating contents of package'))
}

/**
 * Package everything using `nuget`.
 */
function createPackage (options, dir) {
  options.logger('Creating package at ' + dir)

  const applicationDir = path.join(dir, options.name)
  const nugetDir = path.join(dir, 'nuget')
  const specFile = path.join(nugetDir, options.name + '.nuspec')

  const cmd = path.resolve(__dirname, '../vendor/nuget/NuGet.exe')
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
    .catch(wrapError('creating package with NuGet'))
}

/**
 * Find the package just created.
 */
function findPackage (options, dir) {
  const packagePattern = path.join(dir, 'nuget', '*.nupkg')
  options.logger('Finding package with pattern ' + packagePattern)

  return glob(packagePattern)
    .then(files => ({
      dir: dir,
      pkg: files[0]
    })).catch(wrapError('finding package with pattern'))
}

/**
 * Sync remote releases.
 */
function syncRemoteReleases (options, dir, pkg) {
  if (!options.remoteReleases) {
    return {dir: dir, pkg: pkg}
  }

  options.logger('Syncing package at ' + dir)

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
    })).catch(wrapError('syncing remote releases'))
}

/**
 * Releasify everything using `squirrel`.
 */
const releasifyPackage = function (options, dir, pkg) {
  options.logger('Releasifying package at ' + dir)

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
      '/f "' + path.resolve(options.certificateFile) + '"',
      '/p "' + options.certificatePassword + '"'
    ].join(' '))
  }

  if (options.noMsi) {
    args.push('--no-msi')
  }

  return spawn(cmd, args, options.logger)
    .then(() => dir)
    .catch(wrapError('releasifying package'))
}

/**
 * Move the package files to the specified destination.
 */
function movePackage (options, dir) {
  options.logger('Moving package to destination')

  const packagePattern = path.join(dir, 'squirrel', '*')

  return glob(packagePattern)
    .then(files => Promise.all(files.map(file => {
      let dest = options.rename(options.dest, path.basename(file))
      dest = _.template(dest)(options)
      options.logger('Moving file ' + file + ' to ' + dest)
      return fs.move(file, dest, {clobber: true})
    })))
    .catch(wrapError('moving package files'))
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
      return data.logger('Creating package with options\n' + JSON.stringify(options, null, 2))
    }).then(() => createDir(options))
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
      data.logger(errorMessage('creating package', err))
      throw err
    })

  return nodeify(promise, callback)
}
