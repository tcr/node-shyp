#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var async = require('async');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var request = require('request');
var semver = require('semver');
var os = require('os');
require('colors');

/**

  Usage: node-gyp <command> [options]

  where <command> is one of:
    - build - Invokes `make` and builds the module
    - clean - Removes any generated build files and the "out" dir
    - configure - Generates a Makefile for the current module
    - rebuild - Runs "clean", "configure" and "build" all at once
    - install - Install node development files for the specified node version.
    - list - Prints a listing of the currently installed node development files
    - remove - Removes the node development files for the specified version

  for specific command usage and options try:
    $ node-gyp <command> --help

node-gyp@0.12.1  /usr/local/lib/node_modules/node-gyp
node@0.10.18

**/

function cmd (path, args, opts, next)
{
  opts.cwd = opts.cwd || process.cwd();

  if (process.platform == 'win32') {
    args = ['/c', path].concat(args);
    path = process.env.comspec;
  }

  var proc = spawn(path, args, opts);

  if (opts.encoding) {
    proc.stdout.setEncoding(opts.encoding);
    proc.stderr.setEncoding(opts.encoding);
  }
  if (opts.verbose) {
    proc.stdout.pipe((typeof opts.verbose == 'object' ? opts.verbose : process).stdout);
    proc.stderr.pipe((typeof opts.verbose == 'object' ? opts.verbose : process).stderr);
  }

  var stdout = [], stderr = [];
  proc.stdout.on('data', function (data) {
    stdout.push(data);
  })
  proc.stderr.on('data', function (data) {
    stderr.push(data);
  })
  proc.on('exit', function (code) {
    if (opts.encoding) {
      var out = stdout.join('');
      var err = stderr.join('');
    } else {
      var out = Buffer.concat(stdout);
      var err = Buffer.concat(stderr);
    }
    next && next(code, out, err);
  });
  proc.on('error', function (data) {
    // stderr.push(new Buffer(data.toString()));
    throw data;
  })

  return proc;
}

function gyp (type, args, opts, next)
{
  return cmd('node-gyp', [type].concat(args || [], os.arch() == 'x64' ? ['--msvs_version=2012'] : []), opts, next);
}

// returns a promise
function npm (type, args, opts, next)
{
  return cmd((process.platform == 'win32' ? 'npm.cmd' : 'npm'), [type].concat(args || []), opts, next);
}





var shyp = module.exports;

shyp.test = function (args, opts, next) {
  npm('install', [], opts, function (code, stdout, stderr) {
    if (code) {
      next(code, stdout, stderr);
    } else {
      gyp('rebuild', [], opts, function (code, stdout, stderr) {
        if (code) {
          next(code, stdout, stderr);
        } else {
          npm('test', args, opts, next);
        }
      });
    }
  });
}

// process.versions.modules added in >= v0.10.4 and v0.11.7
// https://github.com/joyent/node/commit/ccabd4a6fa8a6eb79d29bc3bbe9fe2b6531c2d8e
function nodeABI () {
  return process.versions.modules
    ? 'node-v' + (+process.versions.modules)
    : process.versions.v8.match(/^3\.14\./)
      ? 'node-v11'
      : 'v8-' + process.versions.v8.split('.').slice(0,2).join('.');
}

shyp.publish = function (args, opts, next)
{
  var manifest = require(path.join(process.cwd(), './package.json'));
  var bundle = manifest.name + '-shyp-' + process.platform + '-' + process.arch;
  var outdir =  './build/shyp/';
  var builddir = './build/' + (process.config.target_defaults.defaut_configuration || 'Release') + '/'; // TODO

  // TODO have this be customizable.
  var abis = {
    'v8-3.11': '0.8.26',
    'node-v11': '0.10.26',
    'node-v14': '0.12.0',
    'node-v43': '1.1.0',
  };
  abis[nodeABI()] = process.versions.node;

  rimraf.sync(outdir);

  gyp('clean', [], {
    verbose: true
  }, function (code) {
    async.eachSeries(Object.keys(abis), function (abi, next) {
      gyp('configure', ['--target=' + abis[abi]], {
        verbose: true
      }, function (code) {
        gyp('build', ['--target=' + abis[abi]], {
          verbose: true
        }, function (code) {
          if (code) {
            console.error('ERR'.red, 'Could not build for module abi ' + abi + ' (node version ' + abis[abi] + '), brb dying.');
            process.exit(1);
          } else {
            console.error('AOK'.green, 'Compiled for abi', abi, '\n\n');
          }

          var outdirabi = outdir + abi + '/';
          mkdirp(outdirabi, function (err) {
            fs.readdirSync(builddir).forEach(function (file) {
              if (fs.lstatSync(builddir + file).isFile() && file.match(/\.(exp|lib|node|dylib|exe|dll)$|^[^.]+$/)) {
                fs.writeFileSync(outdirabi + file, fs.readFileSync(builddir + file), {
                  mode: fs.lstatSync(builddir + file).mode
                });
              }
            })

            next();
          })
        })
      });
    }, function () {
      // get next semver
      request('http://registry.npmjs.org/' + bundle + '/', {
        json: true,
      }, function (err, req, body) {
        var lastversion = (body && body.time && Object.keys(body.time).filter(function (a) {
          return semver.valid(a) && a.match(/\-/);
        }).sort(semver.rcompare)[0]);
        if (lastversion) {
          console.error('LAST SHYP VERSION:'.green, lastversion);
        }

        // Inc prerelease to ensure manifest.version isn't *gt* than lastversion
        // because it lacks a prerelease tag.
        var nextversion = !lastversion || semver.gt(semver.inc(manifest.version, 'prerelease', false), lastversion, true)
          ? semver.inc(manifest.version, 'prerelease', false)
          : semver.inc(lastversion, 'prerelease', false);
        console.error('NEXT SHYP VERSION:'.green, nextversion);

        // Write package.json for publishing.
        fs.writeFileSync(outdir + 'package.json', JSON.stringify({
          name: bundle,
          version: nextversion,
          description: 'Compiled version of "' + manifest.name + '" for ' + process.platform + '-' + process.arch,
          repository: manifest.repository || {
            "type" : "git"
            , "url" : "http://github.com/tcr/node-shyp.git"
          },
          os: [ process.platform ],
          arch: [ process.arch ]
        }));

        console.error('\nPublishing "' + outdir + '"...');

        if (args.indexOf('--dry') == -1 && args.indexOf('--dry-run') == -1) {
          if (args.indexOf('--pack') != -1) {
            // publish
            npm('pack', [], {
              cwd: outdir,
              verbose: true
            }, next);
          } else {
            // publish
            npm('publish', [], {
              cwd: outdir,
              verbose: true
            }, next);
          }
        }
      });
    })
  });
}

shyp.init = function ()
{
  var fs = require('fs');
  fs.readdirSync(__dirname + '/bin').forEach(function (file) {
    console.log('writing ' + file + '...');
    fs.writeFileSync(file, fs.readFileSync(__dirname + '/bin/' + file));
  });
  console.error('done. add this to your package.json:');
  console.log('\n{\n  "scripts": {\n    "install": "node shyp-blacklist.js win32-x64 [etc...] || node-gyp rebuild"\n  }\n}');
}

shyp.build = gyp.bind(null, 'build')
shyp.clean = gyp.bind(null, 'clean')
shyp.configure = gyp.bind(null, 'configure')
shyp.rebuild = gyp.bind(null, 'rebuild')
shyp.install = gyp.bind(null, 'install')
shyp.list = gyp.bind(null, 'list')
shyp.remove = gyp.bind(null, 'remove')

shyp.abi = function () {
  console.log(nodeABI());
}

if (require.main === module) {
  if (shyp.hasOwnProperty(process.argv[2])) {
    shyp[process.argv[2]](process.argv.slice(3), {
      verbose: true
    }, function (code) {
      process.exit(code);
    });
  } else {
    console.error('Usage:');
    Object.keys(shyp).forEach(function (a) {
      console.error('    node-shyp ' + a);
    });
    process.exit(1);
  }
}