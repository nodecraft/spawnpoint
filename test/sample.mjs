import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import spawnpoint from '../index.js';

describe('spawnpoint.sample', () => {
	const app = new spawnpoint();
	it('fails with bad/invalid options', () => {
		expect(app.sample('')).toBeFalsy();
		expect(app.sample(false)).toBeFalsy();
		expect(app.sample(true)).toBeFalsy();
	});

	it('successfully picks items', () => {
		const tests = {
			obj: {
				foo: 'bar',
				bar: 'foo',
			},
			deepObj: {
				foo: {
					bar: {
						one: 'two',
					},
				},
				a: {
					foo: {
						three: 'four',
					},
				},
			},
			arr: [
				'foo', 'bar',
			],
		};


		expect(_.keys(tests.obj)).toContain(app.sample(tests.obj));
		expect(_.findKey(tests.deepObj, app.sample(tests.deepObj))).toBeTruthy();
		expect(tests.arr).toContain(app.sample(tests.arr));
	});

	it('returns undefined for empty collections', () => {
		expect(app.sample({})).toBeUndefined();
		expect(app.sample([])).toBeUndefined();
	});

	it('returns the only item from single-item collections', () => {
		expect(app.sample({ only: 'value' })).toBe('value');
		expect(app.sample(['single'])).toBe('single');
	});
});
