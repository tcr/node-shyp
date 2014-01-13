exports.resolve = function (name) {
	var precompiled = require('../package.json').name + '-bin-' + process.platform + '-' + process.arch + '/';
	var compiled = __dirname + '/build/' + (process.config.target_defaults.defaut_configuration || 'Release') + '/';
	try {
		require(precompiled + 'package.json');
	} catch (e) {
		return compiled + name
	}
	return precompiled + name
};