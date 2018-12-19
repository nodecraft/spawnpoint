'use strict';
const assert = require('assert');
const spawnpoint = require('..');
describe('spawnpoint.roundRobin', () => {
	const app = new spawnpoint();
	it('fails with bad/invalid options', () => {
		assert.throws(() => app.roundRobin(''), Error);
		assert.throws(() => app.roundRobin(10), Error);
		assert.throws(() => app.roundRobin(false), Error);
		assert.throws(() => app.roundRobin(true), Error);
		assert.throws(() => app.roundRobin({foo: 'bar'}), Error);
		assert.throws(() => app.roundRobin("five"), Error);
	});
	it('never calls the same value', () => {

		const test = ['one', 'two', 'three', 'four', 'five'];
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
});