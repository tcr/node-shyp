#!/usr/bin/env node
var fs = require('fs');
var path = require('path');

var manifest = require(path.join(process.cwd(), '../package.json'));

var bundle = manifest.name + '-bin-' + process.platform + '-' + process.arch;
var outdir =  './build/bundle/';
var builddir = './build/' + (process.config.target_defaults.defaut_configuration || 'Release') + '/';

try {
	fs.mkdirSync(outdir);
} catch (e) { }
fs.readdirSync(builddir).forEach(function (file) {
	if (fs.lstatSync(builddir + file).isFile() && file.match(/\.(exp|lib|node|dylib)$/)) {
		fs.writeFileSync(outdir + file, fs.readFileSync(builddir + file));
	}
})
fs.writeFileSync(outdir + 'package.json', JSON.stringify({
	name: bundle,
	version: manifest.version,
	os: [ process.platform ]
}));

console.log(path.join(process.cwd(), 'build/bundle/'))
