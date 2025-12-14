import path from 'node:path';
import { fileURLToPath } from 'node:url';

import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import spawnpoint from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// recursiveList uses fs.statSync with relative paths, so we need process.chdir
// to ensure paths like 'store/list' resolve correctly
process.chdir(__dirname);

describe('spawnpoint.recursiveList', () => {
	const app = new spawnpoint({ cwd: __dirname });
	it('fails with bad/invalid path', () => {
		expect(() => app.recursiveList()).toThrow(Error);
		expect(() => app.recursiveList(false)).toThrow(Error);
		expect(() => app.recursiveList(true)).toThrow(Error);
		expect(() => app.recursiveList({ foo: 'bar' })).toThrow(Error);
		expect(() => app.recursiveList(['foo', 'bar'])).toThrow(Error);

		// REVIEW: these tests due to the way recursiveList suppresses empty results to an empty array.
		// This might be worth reviewing when an error is expected, rather than a silent result.
		// The reasoning currently is that it's internal for a positive result of "find what you can"

		// expect(() => app.recursiveList('')).toThrow(Error);
		// expect(() => app.recursiveList('invalid/path')).toThrow(Error);
	});

	it('lists files', () => {
		const tests = {
			default: [],
			js: [],
			txt: [
				'store/list/1.txt',
				'store/list/2.txt',
				'store/list/3.txt',
				'store/list/recursive/4.txt',
			],
		};

		const results = {
			default: app.recursiveList('store/list'),
			js: app.recursiveList('store/list', '.js'),
			txt: app.recursiveList('store/list', '.txt'),
		};

		expect(_.xor(tests.default, results.default).length, `default list failed to match expected [${tests.default.join(',')}]. Provided [${results.default.join(',')}]`).toBe(0);
		expect(_.xor(tests.js, results.js).length, `js list failed to match expected [${tests.js.join(',')}]. Provided [${results.js.join(',')}]`).toBe(0);
		expect(_.xor(tests.txt, results.txt).length, `txt list failed to match expected [${tests.txt.join(',')}]. Provided [${results.txt.join(',')}]`).toBe(0);
	});

	it('lists files a single directory away', () => {
		const tests = {
			json: [
				'json/bad.json',
				'json/badLint.json',
				'json/commented.json',
				'json/good.json',
			],
		};
		const results = {
			default: app.recursiveList('json'),
			json: app.recursiveList('json', '.json'),
		};
		expect(results.default).toEqual([]);
		expect(results.json).toEqual(tests.json);
	});

	it('lists directories', () => {
		const test = [
			'./config',
			'./json',
			'./store',
		];
		const results = app.recursiveList('.', '/');
		for (const dir of test) {
			expect(results).toContain(dir);
		}
	});

	it('returns empty array for non-existent directory', () => {
		const results = app.recursiveList('non-existent-directory');
		expect(results).toEqual([]);
	});

	it('returns empty array when path is a file, not directory', () => {
		const results = app.recursiveList('store/list/1.txt');
		expect(results).toEqual([]);
	});

	it('accepts string extension and converts to array', () => {
		const results = app.recursiveList('store/list', '.txt');
		expect(results.length).toBeGreaterThan(0);
		expect(results.every(file => file.endsWith('.txt'))).toBe(true);
	});

	it('returns all files when exts is falsy', () => {
		const results = app.recursiveList('store/list', false);
		expect(results.length).toBeGreaterThan(0);
	});

	it('handles backslash path normalization', () => {
		// This tests that paths with backslashes are normalized to forward slashes
		const results = app.recursiveList('.\\store\\list', '.txt');
		expect(results.length).toBeGreaterThan(0);
	});

	it('handles trailing slash correctly', () => {
		const withSlash = app.recursiveList('store/list/', '.txt');
		const withoutSlash = app.recursiveList('store/list', '.txt');
		// Both should return the same number of files
		expect(withSlash.length).toEqual(withoutSlash.length);
	});
});
