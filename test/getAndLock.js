'use strict';
const assert = require('assert');
const spawnpoint = require('..'),
	_ = require('lodash'),
	async = require('async');

describe('spawnpoint.getAndLock', () => {
	const app = new spawnpoint();
	it('fails with bad/invalid options', () => {
		assert.throws(() => app.getAndLock(''), Error);
		assert.throws(() => app.getAndLock(10), Error);
		assert.throws(() => app.getAndLock(false), Error);
		assert.throws(() => app.getAndLock(true), Error);
		assert.throws(() => app.getAndLock({foo: 'bar'}), Error);
		assert.throws(() => app.getAndLock("five"), Error);
	});
	it('never calls the same locked value async', (done) => {

		const test = ['one', 'two', 'three', 'four', 'five'];
		const lock = app.getAndLock(test);

		let used = {};

		async.times(test.length * 15, (i, cb) => {
			lock.next((err, results, clear) => {
				if(err){ return cb(err); }
				if(used[results]){
					clear();
					return cb(new Error('Returned another result that is already in use.'));
				}
				used[results] = true;
				setTimeout(() => {
					used[results] = false;
					clear();
					return cb();
				}, _.random(10, 75));
			});
		}, done);
	});
});