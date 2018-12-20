'use strict';
const assert = require('assert');
const spawnpoint = require('..');

process.chdir(__dirname);
describe('spawnpoint.errorCode', () => {
	const app = new spawnpoint();
	app.setup();

	it('Is an errorCode instance', () => {
		assert(app.errorCode('test.code') instanceof app._errorCode);
	});

	it('Throws on an unset code', () => {
		assert.throws(() => app.errorCode('invalid.unset.code'), Error);
	});

	it('Throws on an invalid input', () => {
		assert.throws(() => app.errorCode(), Error);
		assert.throws(() => app.errorCode(null), Error);
		assert.throws(() => app.errorCode(true), Error);
		assert.throws(() => app.errorCode({foo: "bar"}), Error);
		assert.throws(() => app.errorCode(["foo", "bar"]), Error);
	});
	// TODO: print a plugin code
});