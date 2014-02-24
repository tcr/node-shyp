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
	"install": "node shyp-blacklist.js module-name win32-x64 [etc...] || node-gyp rebuild"
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

## Building against Node versions

You should compile a version for each Node version you intend to publish. (As of Feb 2013, releasing for stable versions means building against 0.8.26 and 0.10.26.)

* `0.8.x` uses the tag "v8.3-11" for its node version.
* `0.10.x` uses the tag "v8.3-14" until `0.10.4`, where NODE_MODULE_VERSION is exposed. Shyp hardcodes this version to equal "node-v11".
* `0.10.4` onward uses "node-v11".
* `0.11.x` uses "node-v14".

## License 

MIT