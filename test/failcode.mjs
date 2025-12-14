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

describe('spawnpoint.failCode', () => {
	let app;

	beforeAll(() => new Promise((resolve) => {
		app = new spawnpoint({ cwd: __dirname });
		app.setup(resolve);
	}));

	it('Is an failCode instance', () => {
		expect(app.failCode('test.code')).toBeInstanceOf(app._failCode);
	});

	it('Returns proper json serialized result without data', () => {
		const code = app.failCode('test.code');
		const json = JSON.stringify(code);
		expect(json).toBe('{"name":"failCode","message":"This is a test code.","code":"test.code","data":{}}');
	});

	it('Returns proper json serialized result with data', () => {
		const code = app.failCode('test.code', {
			foo: 'bar',
		});
		const json = JSON.stringify(code);
		expect(json).toBe('{"name":"failCode","message":"This is a test code.","code":"test.code","data":{"foo":"bar"}}');
	});

	it('Throws on an unset code', () => {
		expect(() => app.failCode('invalid.unset.code')).toThrow(Error);
	});

	it('Throws on an invalid input', () => {
		expect(() => app.failCode()).toThrow(Error);
		expect(() => app.failCode(null)).toThrow(Error);
		expect(() => app.failCode(true)).toThrow(Error);
		expect(() => app.failCode({ foo: 'bar' })).toThrow(Error);
		expect(() => app.failCode(['foo', 'bar'])).toThrow(Error);
	});

	it('Ensures data object does not have duplicate code or message', () => {
		const failCode = app.failCode('UNKNOWN', { foo: 'bar' });
		expect(failCode.message).not.toBe(failCode.data.message);
		expect(failCode.code).not.toBe(failCode.data.code);
	});
	// TODO: print a plugin code
});
