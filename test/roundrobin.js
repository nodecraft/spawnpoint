'use strict';
const assert = require('assert');
const _ = require('lodash');
const spawnpoint = require('..');

describe('spawnpoint.roundRobin', () => {
	const app = new spawnpoint();
	const test = ['one', 'two', 'three', 'four', 'five'];

	it('fails with bad/invalid options', () => {
		assert.throws(() => app.roundRobin(''), Error);
		assert.throws(() => app.roundRobin(10), Error);
		assert.throws(() => app.roundRobin(false), Error);
		assert.throws(() => app.roundRobin(true), Error);
		assert.throws(() => app.roundRobin({foo: 'bar'}), Error);
		assert.throws(() => app.roundRobin("five"), Error);
	});

	it('next(): never calls the same value', () => {
		const rr = app.roundRobin(test);

		let used = [];

		let i = 0;
		while(i < (test.length * 15)){
			i++;
			const results = rr.next();
			assert(!used.includes(results), 'roundRobin failed, item was reused unevenly');
			used.push(results);

			// reset when full
			if(used.length === test.length){
				used = [];
			}
		}
	});

	it('item: never calls the same value', () => {
		const rr = app.roundRobin(test);

		let used = [];

		let i = 0;
		while(i < (test.length * 15)){
			i++;
			const results = rr.item;
			assert(!used.includes(results), 'roundRobin failed, item was reused unevenly');
			used.push(results);

			// reset when full
			if(used.length === test.length){
				used = [];
			}
		}
	});

	it('Still works when Spawnpoint has been initialized', () => {
		const newApp = new spawnpoint();
		newApp.setup();
		const rr = newApp.roundRobin(test);

		let used = [];

		let i = 0;
		while(i < (test.length * 15)){
			i++;
			const results = rr.item;
			assert(!used.includes(results), 'roundRobin failed, item was reused unevenly');
			used.push(results);

			// reset when full
			if(used.length === test.length){
				used = [];
			}
		}
	});

	it('clears used list', () => {
		const rr = app.roundRobin(test);
		rr.next();
		rr.next();
		rr.clear();
		assert(rr.rrKeys.length === 0, 'rrKeys is not empty');
	});

	it('trigger error when list is tampered', () => {
		const rr = app.roundRobin(test);
		rr.rrKeys = _.keys(test);
		assert.throws(() => rr.next(), app._errorCode);
	});
});