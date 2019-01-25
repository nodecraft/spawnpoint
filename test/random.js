'use strict';
const assert = require('assert');
const spawnpoint = require('..');
describe('spawnpoint.random', () => {
	const app = new spawnpoint();
	it('fails with bad/invalid options', () => {
		assert.throws(() => app.random(''), Error);
		assert.throws(() => app.random(false), Error);
		assert.throws(() => app.random(true), Error);
		assert.throws(() => app.random({foo: 'bar'}), Error);
		assert.throws(() => app.random(['foo', 'bar']), Error);
		assert.throws(() => app.random("five"), Error);
		assert.throws(() => app.random(10, "invalid-hash"), Error);
	});

	it('successfully creates random strings', () => {
		assert(app.random());
		assert(app.random(50));
		assert(app.random(50, 'md5'));
		assert(app.random(50, 'sha1'));
	});

	it('defaults to 16 if length is less then 1', () => {
		assert(app.random(0).length === 16);
		assert(app.random(-12).length === 16);
	});
});