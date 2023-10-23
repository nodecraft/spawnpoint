'use strict';
const assert = require('node:assert');
const spawnpoint = require('..');
describe('spawnpoint.random', () => {
	const app = new spawnpoint();
	it('fails with bad/invalid options', () => {
		assert.throws(() => app.random(''), Error);
		assert.throws(() => app.random(false), Error);
		assert.throws(() => app.random(true), Error);
		assert.throws(() => app.random({foo: 'bar'}), Error);
		assert.throws(() => app.random(['foo', 'bar']), Error);
		assert.throws(() => app.random('five'), Error);
	});

	it('successfully creates 10000 random strings', () => {
		const randomStrings = [];
		for(let i = 0; i < 10000; i++) {
			randomStrings.push(app.random());
		}
		assert(!randomStrings.every(item => item === randomStrings[0]));
	});

	it('defaults to 16 if length is less then 1', () => {
		assert(app.random(0).length === 16);
		assert(app.random(-12).length === 16);
	});
});
