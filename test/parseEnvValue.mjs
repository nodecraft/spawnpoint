import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	beforeEach,
	describe,
	expect,
	it,
} from 'vitest';

import spawnpoint from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('spawnpoint._parseEnvValue', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
	});

	it('returns non-string values unchanged', () => {
		expect(app._parseEnvValue(123)).toBe(123);
		expect(app._parseEnvValue(null)).toBe(null);
		expect(app._parseEnvValue(undefined)).toBe(undefined);
		expect(app._parseEnvValue({ foo: 'bar' })).toEqual({ foo: 'bar' });
	});

	it('parses "true" to boolean true (case-insensitive)', () => {
		expect(app._parseEnvValue('true')).toBe(true);
		expect(app._parseEnvValue('TRUE')).toBe(true);
		expect(app._parseEnvValue('True')).toBe(true);
	});

	it('parses "false" to boolean false (case-insensitive)', () => {
		expect(app._parseEnvValue('false')).toBe(false);
		expect(app._parseEnvValue('FALSE')).toBe(false);
		expect(app._parseEnvValue('False')).toBe(false);
	});

	it('parses "null" to null (case-insensitive)', () => {
		expect(app._parseEnvValue('null')).toBe(null);
		expect(app._parseEnvValue('NULL')).toBe(null);
		expect(app._parseEnvValue('Null')).toBe(null);
	});

	it('parses integer strings to numbers', () => {
		expect(app._parseEnvValue('42')).toBe(42);
		expect(app._parseEnvValue('0')).toBe(0);
		expect(app._parseEnvValue('-100')).toBe(-100);
	});

	it('parses float strings to numbers', () => {
		expect(app._parseEnvValue('3.14')).toBe(3.14);
		expect(app._parseEnvValue('-2.5')).toBe(-2.5);
		expect(app._parseEnvValue('0.001')).toBe(0.001);
	});

	it('parses JSON object strings', () => {
		expect(app._parseEnvValue('{"foo":"bar"}')).toEqual({ foo: 'bar' });
		expect(app._parseEnvValue('{"nested":{"value":123}}')).toEqual({ nested: { value: 123 } });
	});

	it('parses JSON array strings', () => {
		expect(app._parseEnvValue('[1,2,3]')).toEqual([1, 2, 3]);
		expect(app._parseEnvValue('["a","b","c"]')).toEqual(['a', 'b', 'c']);
	});

	it('returns original string for invalid JSON', () => {
		expect(app._parseEnvValue('{invalid}')).toBe('{invalid}');
		expect(app._parseEnvValue('[unclosed')).toBe('[unclosed');
	});

	it('returns original string for non-parseable values', () => {
		expect(app._parseEnvValue('hello world')).toBe('hello world');
		expect(app._parseEnvValue('not-a-number')).toBe('not-a-number');
		expect(app._parseEnvValue('')).toBe('');
	});

	it('does not parse JSON when allowJson is false', () => {
		expect(app._parseEnvValue('{"foo":"bar"}', false)).toBe('{"foo":"bar"}');
		expect(app._parseEnvValue('[1,2,3]', false)).toBe('[1,2,3]');
	});

	it('still parses primitives when allowJson is false', () => {
		expect(app._parseEnvValue('true', false)).toBe(true);
		expect(app._parseEnvValue('42', false)).toBe(42);
	});
});
