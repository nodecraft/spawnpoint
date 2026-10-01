'use strict';

const fs = require('node:fs');

const stripJsonCommentsRaw = require('strip-json-comments');

const stripJsonComments = stripJsonCommentsRaw?.default || stripJsonCommentsRaw;

function parse(content) {
	// Most JSON containing `//` is just URLs, and valid JSON has no comments to strip, so try the fast path first
	try {
		return JSON.parse(content);
	} catch (err) {
		if (content.includes('//') || content.includes('/*')) {
			return JSON.parse(stripJsonComments(content));
		}
		throw err;
	}
}

// eslint-disable-next-line n/no-deprecated-api
require.extensions['.json'] = function(module, filename) {
	const content = fs.readFileSync(filename, 'utf8');

	try {
		module.exports = parse(content);
	} catch (err) {
		// Add filename to error for better debugging
		err.message = `${err.message} in ${filename}`;
		throw err;
	}
};
