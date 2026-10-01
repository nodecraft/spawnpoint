import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import '../lib/json-handler.js';

const require = createRequire(import.meta.url);

describe('JSON-handler', () => {
	it('should not error with good files', () => {
		expect(() => require('./json/good.json')).not.toThrow();
		expect(() => require('./json/commented.json')).not.toThrow();
	});

	it('strips comments from commented files', () => {
		expect(require('./json/commented.json')).toEqual({ this: 'is a valid JSON file' });
	});

	it('leaves comment-like sequences inside strings untouched', () => {
		expect(require('./json/urls.json')).toEqual({
			url: 'https://example.com//path',
			glob: 'src/**/*.js',
			block: '/* not a comment */',
		});
	});

	it('should throw a syntax error on a bad file', () => {
		expect(() => require('./json/badLint.json')).toThrow(SyntaxError);
		expect(() => require('./json/bad.json')).toThrow(SyntaxError);
	});
});
