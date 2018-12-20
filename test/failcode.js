'use strict';
const assert = require('assert');
const spawnpoint = require('..');

process.chdir(__dirname);
describe('spawnpoint.failCode', () => {
	const app = new spawnpoint();
	app.setup();

	it('Is an failCode instance', () => {
		assert(app.failCode('test.code') instanceof app._failCode);
	});

	it('Throws on an unset code', () => {
		assert.throws(() => app.failCode('invalid.unset.code'), Error);
	});

	it('Throws on an invalid input', () => {
		assert.throws(() => app.failCode(), Error);
		assert.throws(() => app.failCode(null), Error);
		assert.throws(() => app.failCode(true), Error);
		assert.throws(() => app.failCode({foo: "bar"}), Error);
		assert.throws(() => app.failCode(["foo", "bar"]), Error);
	});
	// TODO: print a plugin code
});