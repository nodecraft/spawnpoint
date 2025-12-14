/* eslint-disable unicorn/custom-error-definition */
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

// resources for creating tests:
// https://sinonjs.org/
// https://github.com/elliotf/mocha-sinon
// https://github.com/mochajs/mocha/issues/1582

// define custom error for testing
class customError extends Error {
	constructor(err) {
		super(err);
		this.name = 'customError';
	}
}

class anotherCustomError extends Error {
	constructor(err) {
		super(err);
		this.name = 'customErrorB';
	}
}

describe('spawnpoint.registerError', () => {
	let app;
	beforeEach(() => new Promise((resolve) => {
		app = new spawnpoint({ cwd: __dirname });
		app.setup(resolve);
	}));

	it('can create a customError for testing', () => {
		expect(new customError('test')).toBeInstanceOf(customError);
	});

	it('can register an error', () => {
		app.registerError('test.code', customError);
		expect(app.errorMaps['test.code']).toBeTruthy();
	});
});

describe('spawnpoint.maskErrorToCode', () => {
	let app;
	beforeEach(() => new Promise((resolve) => {
		app = new spawnpoint({ cwd: __dirname });
		app.registerError('test.code', customError);
		app.registerError('test.code.b', anotherCustomError);
		app.setup(resolve);
	}));

	it('can register an error', () => {
		expect(app.maskErrorToCode(new customError('test'))).toBeTruthy();
	});

	it('throws when invalid type is passed', () => {
		expect(() => app.maskErrorToCode(new customError('test'), 'invalidError')).toThrow();
	});

	it('is errorCode', () => {
		expect(app.maskErrorToCode(new customError('test'), 'errorCode')).toBeInstanceOf(app._errorCode);
	});

	it('is failCode', () => {
		expect(app.maskErrorToCode(new customError('test'), 'failCode')).toBeInstanceOf(app._failCode);
	});
});

describe('spawnpoint.loadErrorMap', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
	});

	it('Runs correctly, without plugins', () => new Promise((resolve) => {
		app.setup(() => {
			app.on('app.setup.loadErrorMap', resolve);
			app.loadErrorMap();
		});
	}));

	it('Runs correctly, with plugins', () => new Promise((resolve) => {
		app.setup(() => {
			app.plugins = [
				{
					name: 'fake plugin`',
					errors: {
						'test.code': customError,
					},
				},
				{
					name: 'Another fake plugin',
				},
			];
			app.on('app.setup.loadErrorMap', () => {
				expect(app.errorMaps['test.code']).toBeTruthy();
				resolve();
			});
			app.loadErrorMap();
		});
	}));
});

describe('spawnpoint.maskErrorToCode edge cases', () => {
	let app;
	beforeEach(() => new Promise((resolve) => {
		app = new spawnpoint({ cwd: __dirname });
		app.registerError('test.code', customError);
		app.setup(resolve);
	}));

	it('returns false when error does not match any registered error', () => {
		const result = app.maskErrorToCode(new Error('generic error'));
		expect(result).toBe(false);
	});

	it('returns false for non-Error objects', () => {
		const result = app.maskErrorToCode('not an error');
		expect(result).toBe(false);
	});

	it('returns false for null', () => {
		const result = app.maskErrorToCode(null);
		expect(result).toBe(false);
	});

	it('correctly masks error to code type', () => {
		const result = app.maskErrorToCode(new customError('test'), 'code');
		expect(result).toBeTruthy();
		expect(result.code).toBe('test.code');
	});
});
