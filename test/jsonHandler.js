'use strict';
require('../lib/json-handler.js');
const expect = require('unexpected');

describe('JSON-handler', () => {
	it('should not error with good files', () => {
		expect(() => require('./json/good.json'), 'not to error');
		expect(() => require('./json/commented.json'), 'not to error');
	});

	it('should throw a syntax error on a bad file', () => {
		expect(() => require('./json/badLint.json'), 'to throw a', SyntaxError);
		expect(() => require('./json/bad.json'), 'to throw a', SyntaxError);
	});
});
