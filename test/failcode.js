'use strict';
const assert = require('node:assert');
const spawnpoint = require('..');

process.chdir(__dirname);
describe('spawnpoint.failCode', () => {
	const app = new spawnpoint();
	app.setup();

	it('Is an failCode instance', () => {
		assert(app.failCode('test.code') instanceof app._failCode);
	});

	it('Returns proper json serialized result without data', () => {
		const code = app.failCode('test.code');
		const json = JSON.stringify(code);
		assert.strictEqual(json, '{"name":"failCode","message":"This is a test code.","code":"test.code","data":{}}');
	});

	it('Returns proper json serialized result with data', () => {
		const code = app.failCode('test.code', {
			foo: 'bar',
		});
		const json = JSON.stringify(code);
		assert.strictEqual(json, '{"name":"failCode","message":"This is a test code.","code":"test.code","data":{"foo":"bar"}}');
	});

	it('Throws on an unset code', () => {
		assert.throws(() => app.failCode('invalid.unset.code'), Error);
	});

	it('Throws on an invalid input', () => {
		assert.throws(() => app.failCode(), Error);
		assert.throws(() => app.failCode(null), Error);
		assert.throws(() => app.failCode(true), Error);
		assert.throws(() => app.failCode({foo: 'bar'}), Error);
		assert.throws(() => app.failCode(['foo', 'bar']), Error);
	});

	it('Ensures data object does not have duplicate code or message', () => {
		const failCode = app.failCode('UNKNOWN', {foo: 'bar'});
		assert.notStrictEqual(failCode.message, failCode.data.message);
		assert.notStrictEqual(failCode.code, failCode.data.code);
	});
	// TODO: print a plugin code
});
