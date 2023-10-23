'use strict';

const fs = require('node:fs');
const {format} = require('node:util');

const jsonLint = require('json-lint');
const stripJsonComments = require('strip-json-comments');

// eslint-disable-next-line node/no-deprecated-api
require.extensions['.json'] = function(module, filename) {
	let content = fs.readFileSync(filename, 'utf8');
	content = stripJsonComments(content);
	const lint = jsonLint(content);
	try{
		module.exports = JSON.parse(content);
	}catch{
		let errorText;
		if(lint.error) {
			errorText = format('%s (%s:%s:%s)', lint.error, filename, lint.line, lint.character);
			throw new SyntaxError(errorText, filename, lint.line);
		}
		throw new SyntaxError(errorText, filename);
	}
};
