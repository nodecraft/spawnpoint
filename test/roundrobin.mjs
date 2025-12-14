import path from 'node:path';
import { fileURLToPath } from 'node:url';

import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import spawnpoint from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('spawnpoint.roundRobin', () => {
	const app = new spawnpoint({ cwd: __dirname });
	const test = ['one', 'two', 'three', 'four', 'five'];

	it('fails with bad/invalid options', () => {
		expect(() => app.roundRobin('')).toThrow(Error);
		expect(() => app.roundRobin(10)).toThrow(Error);
		expect(() => app.roundRobin(false)).toThrow(Error);
		expect(() => app.roundRobin(true)).toThrow(Error);
		expect(() => app.roundRobin({ foo: 'bar' })).toThrow(Error);
		expect(() => app.roundRobin('five')).toThrow(Error);
	});

	it('next(): never calls the same value', () => {
		const rr = app.roundRobin(test);

		let used = [];

		let i = 0;
		while (i < (test.length * 15)) {
			i++;
			const results = rr.next();
			expect(used).not.toContain(results);
			used.push(results);

			// reset when full
			if (used.length === test.length) {
				used = [];
			}
		}
	});

	it('item: never calls the same value', () => {
		const rr = app.roundRobin(test);

		let used = [];

		let i = 0;
		while (i < (test.length * 15)) {
			i++;
			const results = rr.item;
			expect(used).not.toContain(results);
			used.push(results);

			// reset when full
			if (used.length === test.length) {
				used = [];
			}
		}
	});

	it('Still works when Spawnpoint has been initialized', () => {
		const newApp = new spawnpoint({ cwd: __dirname });
		newApp.setup();
		const rr = newApp.roundRobin(test);

		let used = [];

		let i = 0;
		while (i < (test.length * 15)) {
			i++;
			const results = rr.item;
			expect(used).not.toContain(results);
			used.push(results);

			// reset when full
			if (used.length === test.length) {
				used = [];
			}
		}
	});

	it('clears used list', () => {
		const rr = app.roundRobin(test);
		rr.next();
		rr.next();
		rr.clear();
		expect(rr.rrKeys.length).toBe(0);
	});

	it('trigger error when list is tampered', () => {
		const rr = app.roundRobin(test);
		rr.rrKeys = _.keys(test);
		expect(() => rr.next()).toThrow(app._errorCode);
	});
});
