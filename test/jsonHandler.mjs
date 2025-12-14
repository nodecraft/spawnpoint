import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import '../lib/json-handler.js';

const require = createRequire(import.meta.url);

describe('JSON-handler', () => {
	it('should not error with good files', () => {
		expect(() => require('./json/good.json')).not.toThrow();
		expect(() => require('./json/commented.json')).not.toThrow();
	});

	it('should throw a syntax error on a bad file', () => {
		expect(() => require('./json/badLint.json')).toThrow(SyntaxError);
		expect(() => require('./json/bad.json')).toThrow(SyntaxError);
	});
});
