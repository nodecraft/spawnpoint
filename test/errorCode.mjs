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

describe('spawnpoint.errorCode', () => {
	let app;

	beforeAll(() => new Promise((resolve) => {
		app = new spawnpoint({ cwd: __dirname });
		app.setup(resolve);
	}));

	it('Is an errorCode instance', () => {
		expect(app.errorCode('test.code')).toBeInstanceOf(app._errorCode);
	});

	it('Returns proper json serialized result without data', () => {
		const code = app.errorCode('test.code');
		const json = JSON.stringify(code);
		expect(json).toBe('{"name":"errorCode","message":"This is a test code.","code":"test.code","data":{}}');
	});

	it('Returns proper json serialized result with data', () => {
		const code = app.errorCode('test.code', {
			foo: 'bar',
		});
		const json = JSON.stringify(code);
		expect(json).toBe('{"name":"errorCode","message":"This is a test code.","code":"test.code","data":{"foo":"bar"}}');
	});

	it('Throws on an unset code', () => {
		expect(() => app.errorCode('invalid.unset.code')).toThrow(Error);
	});

	it('Throws on an invalid input', () => {
		expect(() => app.errorCode()).toThrow(Error);
		expect(() => app.errorCode(null)).toThrow(Error);
		expect(() => app.errorCode(true)).toThrow(Error);
		expect(() => app.errorCode({ foo: 'bar' })).toThrow(Error);
		expect(() => app.errorCode(['foo', 'bar'])).toThrow(Error);
	});
	// TODO: print a plugin code
});
