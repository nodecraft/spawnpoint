'use strict';

var fs = require('fs'),
	util = require('util');

var json5 = require('./json5'),

require.extensions['.json5'] = function (module, filename) {
    var content = fs.readFileSync(filename, 'utf8');
    try{
    	module.exports = JSON5.parse(content);
    }catch(err){
    	var errorText = util.format('JSON5 parse: %s (%s:%s)', err.message, filename, err.at);
    	throw new SyntaxError(errorText);
    }
};
