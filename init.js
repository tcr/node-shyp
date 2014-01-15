#!/usr/bin/env node

var fs = require('fs');

fs.mkdirSync('shyp');
fs.readdirSync(__dirname + '/bin').forEach(function (file) {
	console.log('writing ' + file + '...');
	fs.writeFileSync('shyp/' + file, fs.readFileSync(__dirname + '/bin/' + file));
});

console.error('Success. You can add support to your package.json as such:\n')
console.error([
'{',
'  "name": "coolmodule",',
'  "version": "1.1.3",',
'  "optionalDependencies": {',
'    "coolmodule-shyp-win32-x64": "1.1.3"',
'  }',
'  "scripts": {',
'    "install": "node ./shyp/blacklist.js win32-x64 || node-gyp rebuild"',
'  }',
'}'
].join('\n'))