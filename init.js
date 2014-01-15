#!/usr/bin/env node

var fs = require('fs');
fs.readdirSync(__dirname + '/bin').forEach(function (file) {
	console.log('writing ' + file + '...');
	fs.writeFileSync(file, fs.readFileSync(__dirname + '/bin/' + file));
});
console.error('done.')