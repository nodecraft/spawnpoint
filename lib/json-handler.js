'use strict';

const fs = require('node:fs');

const stripJsonCommentsRaw = require('strip-json-comments');

const stripJsonComments = stripJsonCommentsRaw?.default || stripJsonCommentsRaw;

// eslint-disable-next-line n/no-deprecated-api
require.extensions['.json'] = function(module, filename) {
	let content = fs.readFileSync(filename, 'utf8');

	// Only strip comments if file likely contains them
	if (content.includes('//') || content.includes('/*')) {
		content = stripJsonComments(content);
	}

	try {
		module.exports = JSON.parse(content);
	} catch (err) {
		// Add filename to error for better debugging
		err.message = `${err.message} in ${filename}`;
		throw err;
	}
};
