# node-shyp

Precompile your node modules, use npm as your data store:

```
coolmodule
optional:
  coolmodule-shyp-win32-x64
  coolmodule-shyp-win32-ia32
  coolmodule-shyp-darwin-x64
  coolmodule-shyp-darwin-ia32
  ...
```

## Installation

To install

```
npm install -g node-shyp
```

## Instructions

node-shyp is simple. All your node-gyp configuration works as before, with just a few modifications to `package.json`.

#### 1. Run `node-shyp init` to create default `shyp-blacklist.js` file in your root

#### 2. Set your "install" script to blacklist compiled platforms on npm install

```
"scripts": {
	"install": "node shyp-blacklist.js win32-x64 [etc...] || node-gyp rebuild"
}
```

#### 3. Add compiled modules as optional dependencies

Node will only install those dependencies that match your arch/platform (due to the published code's package.json settings).

```
{
	"version": "1.1.3",
	"optionalDependencies": {
       "coolmodule-shyp-win32-x64": "1.1.3",
       ...
    }
}
```

#### 4. Run `node-shyp publish` from the root directory on each platform you build for.

This will publish the compiled versions of the code to npm.

#### 5. `npm install bindings-shyp` to load the precompiled version or the loaded version.

Just like the `bindings` module.

```
module.exports = require('bindings-shyp')('canvas')
```

## License 

MIT