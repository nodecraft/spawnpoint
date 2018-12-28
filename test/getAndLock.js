'use strict';
const assert = require('assert');
const spawnpoint = require('..'),
	_ = require('lodash'),
	async = require('async');

describe('spawnpoint.getAndLock', () => {
	const app = new spawnpoint();
	const test = ['one', 'two', 'three', 'four', 'five'];

	it('fails with bad/invalid options', () => {
		assert.throws(() => app.getAndLock(''), Error);
		assert.throws(() => app.getAndLock(10), Error);
		assert.throws(() => app.getAndLock(false), Error);
		assert.throws(() => app.getAndLock(true), Error);
		assert.throws(() => app.getAndLock({foo: 'bar'}), Error);
		assert.throws(() => app.getAndLock("five"), Error);
	});

	it('never calls the same locked value async', (done) => {
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

	it('Still works even when spawnpoint is initialized', (done) => {
		const newApp = new spawnpoint();
		newApp.setup();
		const lock = newApp.getAndLock(test);

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

	it('Correctly does not trigger timeout', (done) => {
		const lock = app.getAndLock(test);
		for(let i = 0; i < test.length; i++){
			lock.next((err, results, clear) => {
				if(err){ return done(err); }
				setTimeout(clear, 1);
			});
		}
		lock.next(50, (err, results, clear) => {
			clear();
			done(err);
		});
	});

	it('Correctly triggers timeout', (done) => {
		const lock = app.getAndLock(test);
		for(let i = 0; i < test.length; i++){
			lock.next((err, results, clear) => {
				setTimeout(clear, 250);
			});
		}
		lock.next(100, (err, results, clear) => {
			assert(!results, 'Should not have returned results.');
			assert(err && err.code === 'getAndLock.locked_timeout', 'Wrong error returned: ' + err.code);
			clear();
			setTimeout(done, 750);
		});
	});

	it('Timeout doesn\'t hold up entire queue', (done) => {
		const lock = app.getAndLock(["singleItem"]);
		lock.next((err, results, clear) => {
			setTimeout(clear, 100);
		});
		lock.next(50, (err, results, clear) => {
			assert(!results, 'Should not have returned results.');
			assert(err && err.code === 'getAndLock.locked_timeout', 'Wrong error returned: ' + err.code);
			setTimeout(clear, 500);
		});
		lock.next(1000, (err, results, clear) => {
			clear();
			done(err);
		});
	});

});