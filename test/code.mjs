import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	beforeAll,
	describe,
	expect,
	it,
} from 'vitest';

import spawnpoint from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('spawnpoint.code', () => {
	let app;

	const tests = {
		system: {
			code: 'spawnpoint.register_plugin_on_runtime',
			message: 'App plugin registration has already occurred.',
		},
		custom: {
			code: 'test.code',
			message: 'This is a test code.',
		},
	};

	beforeAll(() => new Promise((resolve) => {
		app = new spawnpoint({ cwd: __dirname });
		app.setup(resolve);
	}));

	it('should print a system code', () => {
		expect(app.code('spawnpoint.register_plugin_on_runtime')).toEqual(tests.system);
	});
	it('should print a app code', () => {
		expect(app.code('test.code')).toEqual(tests.custom);
	});
	it('fills in code and message without overriding provided values', () => {
		const data = { message: 'custom', extra: 1 };
		expect(app.code('test.code', data)).toBe(data);
		expect(data).toEqual({ message: 'custom', extra: 1, code: 'test.code' });
	});
	it('returns a new code object when data is null', () => {
		expect(app.code('test.code', null)).toEqual(tests.custom);
	});
	it('does not throw on frozen data', () => {
		const data = Object.freeze({ extra: 1 });
		expect(app.code('test.code', data)).toBe(data);
		expect(data).toEqual({ extra: 1 });
	});
	it('Throws on an unset code', () => {
		expect(() => app.code('invalid.unset.code')).toThrow(Error);
	});
	it('Throws on an invalid input', () => {
		expect(() => app.code()).toThrow(Error);
		expect(() => app.code(null)).toThrow(Error);
		expect(() => app.code(true)).toThrow(Error);
		expect(() => app.code({ foo: 'bar' })).toThrow(Error);
		expect(() => app.code(['foo', 'bar'])).toThrow(Error);
	});
	// TODO: print a plugin code
});
