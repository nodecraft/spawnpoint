'use strict';

var fs = require('fs'),
	util = require('util');

var jsonLint = require('json-lint'),
	stripJsonComments = require('strip-json-comments');

// TODO: stop doing this
/*eslint-disable */
require.extensions['.json'] = function(module, filename){
	var content = fs.readFileSync(filename, 'utf8');
	content = stripJsonComments(content);
	var lint = jsonLint(content);
	try{
		module.exports = JSON.parse(content);
	}catch(err){
		if(lint.error){
			var errorText = util.format('%s (%s:%s:%s)', lint.error, filename, lint.line, lint.character);
			throw new SyntaxError(errorText, filename, lint.line);
		}
		throw new SyntaxError(errorText, filename);
	}
};
/*eslint-enable */