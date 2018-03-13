'use strict'

const _ = require('lodash')
const asar = require('asar')
const async = require('async')
const child = require('child_process')
const debug = require('debug')
const fs = require('fs-extra')
const glob = require('glob')
const path = require('path')
const temp = require('temp').track()

const pkg = require('../package.json')

const defaultLogger = debug(pkg.name)

const defaultRename = function (dest, src) {
  const ext = path.extname(src)
  if (ext === '.exe' || ext === '.msi') {
    src = '<%= name %>-<%= version %>-setup' + ext
  }
  return path.join(dest, src)
}

/**
 * Execute a file.
 */
const exec = function (options, file, args, callback) {
  let execdProcess = null
  let error = null
  let stderr = ''

  if (process.platform !== 'win32') {
    args = [file].concat(args)
    file = 'mono'
  }

  options.logger('Executing file ' + file + ' ' + args.join(' '))

  try {
    execdProcess = child.execFile(file, args)
  } catch (err) {
    process.nextTick(function () {
      callback(err, stderr)
    })
    return
  }

  execdProcess.stderr.on('data', function (data) {
    stderr += data
  })

  execdProcess.on('error', function (err) {
    error = error || err
  })

  execdProcess.on('close', function (code, signal) {
    if (code !== 0) {
      error = error || signal || code
    }

    callback(error && new Error('Error executing file (' + (error.message || error) + '): ' +
      '\n' + file + ' ' + args.join(' ') + '\n' + stderr))
  })
}

/**
 * Read `package.json` either from `resources.app.asar` (if the app is packaged)
 * or from `resources/app/package.json` (if it is not).
 */
const readMeta = function (options, callback) {
  const withAsar = path.join(options.src, 'resources/app.asar')
  const withoutAsar = path.join(options.src, 'resources/app/package.json')

  try {
    fs.accessSync(withAsar)
    options.logger('Reading package metadata from ' + withAsar)
    callback(null, JSON.parse(asar.extractFile(withAsar, 'package.json')))
    return
  } catch (err) {
  }

  try {
    options.logger('Reading package metadata from ' + withoutAsar)
    callback(null, fs.readJsonSync(withoutAsar))
  } catch (err) {
    callback(new Error('Error reading package metadata: ' + (err.message || err)))
  }
}

/**
 * Get the hash of default options for the installer. Some come from the info
 * read from `package.json`, and some are hardcoded.
 */
const getDefaults = function (data, callback) {
  readMeta(data, function (err, pkg) {
    pkg = pkg || {}

    const year = new Date().getFullYear()

    const authors = pkg.author && [(typeof pkg.author === 'string'
      ? pkg.author.replace(/\s+(<[^>]+>|\([^)]+\))/g, '')
      : pkg.author.name
    )]

    const defaults = {
      name: pkg.name || 'electron',
      productName: pkg.productName || pkg.name,
      description: pkg.description,
      productDescription: pkg.productDescription || pkg.description,
      version: pkg.version || '0.0.0',

      copyright: pkg.copyright || (authors && 'Copyright \u00A9 ' + year + ' ' + authors),
      authors: authors,
      owners: authors,

      homepage: pkg.homepage || (pkg.author && (typeof pkg.author === 'string'
        ? pkg.author.replace(/.*\(([^)]+)\).*/, '$1')
        : pkg.author.url
      )),

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

    callback(err, defaults)
  })
}

/**
 * Get the hash of options for the installer.
 */
const getOptions = function (data, defaults, callback) {
  // Flatten everything for ease of use.
  const options = _.defaults({}, data, data.options, defaults)

  callback(null, options)
}

/**
 * Fill in a template with the hash of options.
 */
const generateTemplate = function (options, file, callback) {
  options.logger('Generating template from ' + file)

  async.waterfall([
    async.apply(fs.readFile, file),
    function (template, callback) {
      const result = _.template(template)(options)
      options.logger('Generated template from ' + file + '\n' + result)
      callback(null, result)
    }
  ], callback)
}

/**
 * Create the nuspec file for the package.
 *
 * See: https://docs.nuget.org/create/nuspec-reference
 */
const createSpec = function (options, dir, callback) {
  const specSrc = path.resolve(__dirname, '../resources/spec.ejs')
  const specDest = path.join(dir, 'nuget', options.name + '.nuspec')
  options.logger('Creating spec file at ' + specDest)

  async.waterfall([
    async.apply(generateTemplate, options, specSrc),
    async.apply(fs.outputFile, specDest)
  ], function (err) {
    callback(err && new Error('Error creating spec file: ' + (err.message || err)))
  })
}

/**
 * Copy the application into the package.
 */
const createApplication = function (options, dir, callback) {
  const applicationDir = path.join(dir, options.name)
  const updateSrc = path.resolve(__dirname, '../vendor/squirrel/Squirrel.exe')
  const updateDest = path.join(applicationDir, 'Update.exe')
  options.logger('Copying application to ' + applicationDir)

  async.waterfall([
    async.apply(fs.copy, options.src, applicationDir),
    async.apply(fs.copy, updateSrc, updateDest)
  ], function (err) {
    callback(err && new Error('Error copying application directory: ' + (err.message || err)))
  })
}

/**
 * Create temporary directory where the contents of the package will live.
 */
const createDir = function (options, callback) {
  options.logger('Creating temporary directory')

  async.waterfall([
    async.apply(temp.mkdir, 'electron-'),
    function (dir, callback) {
      dir = path.join(dir, options.name + '_' + options.version)
      fs.ensureDir(dir, callback)
    }
  ], function (err, dir) {
    callback(err && new Error('Error creating temporary directory: ' + (err.message || err)), dir)
  })
}

/**
 * Create subdirectories where intermediate files will live.
 */
const createSubdirs = function (options, dir, callback) {
  options.logger('Creating subdirectories under ' + dir)

  async.parallel([
    async.apply(fs.ensureDir, path.join(dir, 'nuget')),
    async.apply(fs.ensureDir, path.join(dir, 'squirrel'))
  ], function (err) {
    callback(err && new Error('Error creating temporary subdirectories: ' + (err.message || err)), dir)
  })
}

/**
 * Create the contents of the package.
 */
const createContents = function (options, dir, callback) {
  options.logger('Creating contents of package')

  async.parallel([
    async.apply(createSpec, options, dir),
    async.apply(createApplication, options, dir)
  ], function (err) {
    callback(err, dir)
  })
}

/**
 * Package everything using `nuget`.
 */
const createPackage = function (options, dir, callback) {
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

  exec(options, cmd, args, function (err) {
    callback(err && new Error('Error creating package: ' + (err.message || err)), dir)
  })
}

/**
 * Find the package just created.
 */
const findPackage = function (options, dir, callback) {
  const packagePattern = path.join(dir, 'nuget', '*.nupkg')
  options.logger('Finding package with pattern ' + packagePattern)

  glob(packagePattern, function (err, files) {
    callback(err, dir, files[0])
  })
}

/**
 * Sync remote releases.
 */
const syncRemoteReleases = function (options, dir, pkg, callback) {
  if (!options.remoteReleases) {
    callback(null, dir, pkg)
    return
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

  exec(options, cmd, args, function (err) {
    callback(err && new Error('Error syncing remote releases: ' + (err.message || err)), dir, pkg)
  })
}

/**
 * Releasify everything using `squirrel`.
 */
const releasifyPackage = function (options, dir, pkg, callback) {
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

  exec(options, cmd, args, function (err) {
    callback(err && new Error('Error releasifying package: ' + (err.message || err)), dir)
  })
}

/**
 * Move the package files to the specified destination.
 */
const movePackage = function (options, dir, callback) {
  options.logger('Moving package to destination')

  const packagePattern = path.join(dir, 'squirrel', '*')
  async.waterfall([
    async.apply(glob, packagePattern),
    function (files, callback) {
      async.each(files, function (file) {
        let dest = options.rename(options.dest, path.basename(file))
        dest = _.template(dest)(options)
        options.logger('Moving file ' + file + ' to ' + dest)
        fs.move(file, dest, {clobber: true}, callback)
      }, callback)
    }
  ], function (err) {
    callback(err && new Error('Error moving package files: ' + (err.message || err)), dir)
  })
}

/* ************************************************************************** */

module.exports = function (data, callback) {
  data.rename = data.rename || defaultRename
  data.logger = data.logger || defaultLogger

  async.waterfall([
    async.apply(getDefaults, data),
    async.apply(getOptions, data),
    function (options, callback) {
      data.logger('Creating package with options\n' + JSON.stringify(options, null, 2))
      async.waterfall([
        async.apply(createDir, options),
        async.apply(createSubdirs, options),
        async.apply(createContents, options),
        async.apply(createPackage, options),
        async.apply(findPackage, options),
        async.apply(syncRemoteReleases, options),
        async.apply(releasifyPackage, options),
        async.apply(movePackage, options)
      ], function (err) {
        callback(err, options)
      })
    }
  ], function (err, options) {
    if (!err) {
      data.logger('Successfully created package at ' + options.dest)
    } else {
      data.logger('Error creating package: ' + (err.message || err))
    }

    callback(err, options)
  })
}
