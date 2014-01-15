#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var async = require('async');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

function child (proc, args, opts) {
	args = args || [];
	opts = opts || {};

	if (process.platform == 'win32') {
		args = ['/c', proc].concat(args);
		proc = process.env.comspec;
	}
	opts.cwd = opts.cwd || process.cwd();
	opts.stdio = 'inherit';
	return spawn(proc, args, opts);
}

if (process.argv[2] == 'publish') {
	var manifest = require(path.join(process.cwd(), './package.json'));
	var bundle = manifest.name + '-shyp-' + process.platform + '-' + process.arch;
	var outdir =  './build/shyp/';
	var builddir = './build/' + (process.config.target_defaults.defaut_configuration || 'Release') + '/'; // TODO

	// process.versions.modules added in >= v0.10.4 and v0.11.7
	// https://github.com/joyent/node/commit/ccabd4a6fa8a6eb79d29bc3bbe9fe2b6531c2d8e
	function getNodeModuleABI () {
		return process.versions.modules
			? 'node-v' + (+process.versions.modules)
			: 'v8-' + process.versions.v8.split('.').slice(0,2).join('.');
	}

	var abis = {};
	abis[getNodeModuleABI()] = process.versions.node;
	// TODO more

	rimraf.sync(outdir);

	async.eachSeries(Object.keys(abis), function (abi, next) {
		var gyp = child('node-gyp', ['rebuild', '--target=' + abis[abi]]);
		gyp.on('close', function (code) {
			if (code) {
				console.error('Could not build for module abi ' + abi + ' (node version ' + abis[abi] + '), brb dying.');
				process.exit(1);
			}

			var outdirabi = outdir + abi + '/';
			mkdirp(outdirabi, function (err) {
				fs.readdirSync(builddir).forEach(function (file) {
					if (fs.lstatSync(builddir + file).isFile() && file.match(/\.(exp|lib|node|dylib|exe)$|^[^.]+$/)) {
						fs.writeFileSync(outdirabi + file, fs.readFileSync(builddir + file), {
							mode: fs.lstatSync(builddir + file).mode
						});
					}
				})

				next();
			})
		})
	}, function () {
		fs.writeFileSync(outdir + 'package.json', JSON.stringify({
			name: bundle,
			version: manifest.version,
			os: [ process.platform ],
			arch: [ process.arch ]
		}));

		console.error('\nPublishing "' + outdir + '"...');

		if (process.argv[3] != '--dry') {
			var npm = child('npm', ['publish', '-f'], {
				cwd: outdir
			});
			npm.on('close', function (code) {
				process.exit(code);
			});
		}
	})
} else if (process.argv[2] == 'init') {
	var fs = require('fs');
	fs.readdirSync(__dirname + '/bin').forEach(function (file) {
		console.log('writing ' + file + '...');
		fs.writeFileSync(file, fs.readFileSync(__dirname + '/bin/' + file));
	});
	console.error('done. add this to your package.json:');
	console.log('\n{\n  "scripts": {\n    "install": "node shyp-blacklist.js win32-x64 [etc...] || node-gyp rebuild"\n  }\n}');
} else {
	var gyp = child('node-gyp', process.argv.slice(2), {
		stdio: 'inherit'
	});
	gyp.on('close', function (code) {
		process.exit(code);
	});
}