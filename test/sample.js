'use strict';
const assert = require('assert');
const _ = require('lodash');
const spawnpoint = require('..');
describe('spawnpoint.sample', () => {
	const app = new spawnpoint();
	it('fails with bad/invalid options', () => {
		assert(!app.sample(''));
		assert(!app.sample(false));
		assert(!app.sample(true));
	});

	it('successfully picks items', () => {
		const tests = {
			obj: {
				foo: 'bar',
				bar: 'foo'
			},
			deepObj: {
				foo: {
					bar: {
						one: "two"
					}
				},
				a: {
					foo: {
						three: "four"
					}
				}
			},
			arr: [
				'foo', 'bar'
			]
		};


		assert(_.keys(tests.obj).includes(app.sample(tests.obj)), 'tests.obj failed sample');
		assert(_.findKey(tests.deepObj, app.sample(tests.deepObj)), 'tests.deepObj failed sample');
		assert(tests.arr.includes(app.sample(tests.arr)), 'tests.arr failed sample');
	});
});