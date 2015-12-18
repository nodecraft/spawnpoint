'use strict';

var fs = require('fs'),
	util = require('util');

var _ = require('lodash'),
	jsonLint = require('json-lint');

var hash = /(\#(?:.*)$)/gm,
	whitespace = /(?:\/\*(?:[\s\S]*?)\*\/)|((?:\/\/|\#)(?:.*)$)/gm

require.extensions['.json'] = function (module, filename){
    var content = fs.readFileSync(filename, 'utf8');
    var lint = jsonLint(content.replace(hash, ''), {
    	comments: true
    });
    if(lint.error){
  		var errorText = util.format('%s (%s:%s:%s)', lint.error, filename, lint.line, lint.character);
    	throw new SyntaxError(errorText, filename, lint.line);
    }
    module.exports = JSON.parse(content.replace(whitespace, ''));
};;
