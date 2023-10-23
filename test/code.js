'use strict';
const assert = require('node:assert');
const spawnpoint = require('..');

process.chdir(__dirname);
describe('spawnpoint.code', () => {
	const app = new spawnpoint();
	app.setup();

	const tests = {
		system: {
			code: 'spawnpoint.register_plugin_on_runtime',
			message: 'App plugin registration has already occurred.',
		},
		custom: {
			code: 'test.code',
			message: 'This is a test code.',
		},
	};

	it('should print a system code', () => {
		assert.deepStrictEqual(tests.system, app.code('spawnpoint.register_plugin_on_runtime'));
	});
	it('should print a app code', () => {
		assert.deepStrictEqual(tests.custom, app.code('test.code'));
	});
	it('Throws on an unset code', () => {
		assert.throws(() => app.code('invalid.unset.code'), Error);
	});
	it('Throws on an invalid input', () => {
		assert.throws(() => app.code(), Error);
		assert.throws(() => app.code(null), Error);
		assert.throws(() => app.code(true), Error);
		assert.throws(() => app.code({foo: 'bar'}), Error);
		assert.throws(() => app.code(['foo', 'bar']), Error);
	});
	// TODO: print a plugin code
});
