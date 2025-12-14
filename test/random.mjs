import { describe, expect, it } from 'vitest';

import spawnpoint from '../index.js';

describe('spawnpoint.random', () => {
	const app = new spawnpoint();
	it('fails with bad/invalid options', () => {
		expect(() => app.random('')).toThrow(Error);
		expect(() => app.random(false)).toThrow(Error);
		expect(() => app.random(true)).toThrow(Error);
		expect(() => app.random({ foo: 'bar' })).toThrow(Error);
		expect(() => app.random(['foo', 'bar'])).toThrow(Error);
		expect(() => app.random('five')).toThrow(Error);
	});

	it('successfully creates 10000 random strings', () => {
		const randomStrings = [];
		for (let i = 0; i < 10000; i++) {
			randomStrings.push(app.random());
		}
		expect(randomStrings.every(item => item === randomStrings[0])).toBe(false);
	});

	it('defaults to 16 if length is less then 1', () => {
		expect(app.random(0).length).toBe(16);
		expect(app.random(-12).length).toBe(16);
	});

	it('generates string of specified length', () => {
		expect(app.random(8).length).toBe(8);
		expect(app.random(32).length).toBe(32);
		expect(app.random(64).length).toBe(64);
	});

	it('generates unique strings on each call', () => {
		const str1 = app.random(32);
		const str2 = app.random(32);
		expect(str1).not.toBe(str2);
	});
});
