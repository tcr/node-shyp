#!/usr/bin/env node

var fs = require('fs');

fs.readdirSync(__dirname + '/bin').forEach(function (file) {
	console.log('writing ' + file + '...');
	fs.writeFileSync(file, fs.readFileSync(__dirname + '/bin/' + file));
});

console.error('Success. You can add support to your package.json as such:\n')
console.error([
'{',
'  "name": "coolmodule",',
'  "version": "1.1.3",',
'  "optionalDependencies": {',
'    "coolmodule-bin-win32-x64": "1.1.3"',
'  }',
'  "scripts": {',
'    "preinstall": "(node ./bin/blacklist.js win32-x64 && cd bin && node-gyp rebuild) || exit 0"',
'  }',
'}'
].join('\n'))