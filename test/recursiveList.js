'use strict';
const assert = require('assert');
const _ = require('lodash'),
	spawnpoint = require('..');

describe('spawnpoint.recursiveList', () => {
	const app = new spawnpoint();
	it('fails with bad/invalid path', () => {
		assert.throws(() => app.recursiveList(), Error);
		assert.throws(() => app.recursiveList(false), Error);
		assert.throws(() => app.recursiveList(true), Error);
		assert.throws(() => app.recursiveList({foo: 'bar'}), Error);
		assert.throws(() => app.recursiveList(['foo', 'bar']), Error);

		// REVIEW: these tests due to the way recursiveList suppresses empty results to an empty array.
		// This might be worth reviewing when an error is expected, rather than a silent result.
		// The reasoning currently is that it's internal for a positive result of "find what you can"

		// assert.throws(() => app.recursiveList(''), Error);
		// assert.throws(() => app.recursiveList('invalid/path'), Error);
	});

	it('lists files', () => {
		const tests = {
			default: [],
			js: [],
			txt: [
				"store/list/1.txt",
				"store/list/2.txt",
				"store/list/3.txt",
				"store/list/recursive/4.txt"
			]
		};

		const results = {
			default: app.recursiveList('store/list'),
			js: app.recursiveList('store/list', '.js'),
			txt: app.recursiveList('store/list', '.txt')
		};

		assert(!_.xor(tests.default, results.default).length, `default list failed to match expected [${tests.default.join(',')}]. Provided [${results.default.join(',')}]`);
		assert(!_.xor(tests.js, results.js).length, `js list failed to match expected [${tests.js.join(',')}]. Provided [${results.js.join(',')}]`);
		assert(!_.xor(tests.txt, results.txt).length, `txt list failed to match expected [${tests.txt.join(',')}]. Provided [${results.txt.join(',')}]`);
	});
});