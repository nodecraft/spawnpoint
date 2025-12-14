import path from 'node:path';
import { fileURLToPath } from 'node:url';

import async from 'async';
import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import spawnpoint from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('spawnpoint.getAndLock', () => {
	const app = new spawnpoint({ cwd: __dirname });
	const test = ['one', 'two', 'three', 'four', 'five'];

	it('fails with bad/invalid options', () => {
		expect(() => app.getAndLock('')).toThrow(Error);
		expect(() => app.getAndLock(10)).toThrow(Error);
		expect(() => app.getAndLock(false)).toThrow(Error);
		expect(() => app.getAndLock(true)).toThrow(Error);
		expect(() => app.getAndLock({ foo: 'bar' })).toThrow(Error);
		expect(() => app.getAndLock('five')).toThrow(Error);
	});

	it('never calls the same locked value async', () => new Promise((resolve, reject) => {
		const lock = app.getAndLock(test);

		const used = {};
		async.times(test.length * 15, (i, cb) => {
			lock.next((err, results, clear) => {
				if (err) { return cb(err); }
				if (used[results]) {
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
		}, (err) => {
			if (err) { return reject(err); }
			resolve();
		});
	}));

	it('Still works even when spawnpoint is initialized', () => new Promise((resolve, reject) => {
		const newApp = new spawnpoint({ cwd: __dirname });
		newApp.setup();
		const lock = newApp.getAndLock(test);

		const used = {};
		async.times(test.length * 15, (i, cb) => {
			lock.next((err, results, clear) => {
				if (err) { return cb(err); }
				if (used[results]) {
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
		}, (err) => {
			if (err) { return reject(err); }
			resolve();
		});
	}));

	it('Correctly does not trigger timeout', () => new Promise((resolve, reject) => {
		const lock = app.getAndLock(test);
		for (let i = 0; i < test.length; i++) {
			lock.next((err, results, clear) => {
				if (err) { return reject(err); }
				setTimeout(clear, 1);
			});
		}
		lock.next(50, (err, results, clear) => {
			clear();
			if (err) { return reject(err); }
			resolve();
		});
	}));

	it('Correctly triggers timeout', () => new Promise((resolve) => {
		const lock = app.getAndLock(test);
		for (let i = 0; i < test.length; i++) {
			lock.next((err, results, clear) => {
				setTimeout(clear, 250);
			});
		}
		lock.next(100, (err, results, clear) => {
			expect(results).toBeFalsy();
			expect(err).toBeTruthy();
			expect(err.code).toBe('getAndLock.locked_timeout');
			clear();
			setTimeout(resolve, 750);
		});
	}));

	it('Timeout doesn\'t hold up entire queue', () => new Promise((resolve, reject) => {
		const lock = app.getAndLock(['singleItem']);
		lock.next((err, results, clear) => {
			setTimeout(clear, 100);
		});
		lock.next(50, (err, results, clear) => {
			expect(results).toBeFalsy();
			expect(err).toBeTruthy();
			expect(err.code).toBe('getAndLock.locked_timeout');
			setTimeout(clear, 500);
		});
		lock.next(1000, (err, results, clear) => {
			clear();
			if (err) { return reject(err); }
			resolve();
		});
	}));
});
