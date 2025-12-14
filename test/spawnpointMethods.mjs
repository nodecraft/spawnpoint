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

describe('spawnpoint.omit', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
	});

	it('omits specified keys from object', () => {
		const input = { foo: 'bar', baz: 'qux', keep: 'this' };
		const result = app.omit(input, ['foo', 'baz']);
		expect(result).toEqual({ keep: 'this' });
	});

	it('returns copy when no keys to omit', () => {
		const input = { foo: 'bar' };
		const result = app.omit(input, []);
		expect(result).toEqual(input);
		expect(result).not.toBe(input);
	});

	it('handles missing keys gracefully', () => {
		const input = { foo: 'bar' };
		const result = app.omit(input, ['nonexistent']);
		expect(result).toEqual({ foo: 'bar' });
	});
});

describe('spawnpoint.require', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
	});

	it('requires file with relative path', () => {
		app.require('autoload-sync/sync.js');
		expect(app.customHoistedVarFromAutoload).toBe(true);
	});

	it('requires file with absolute path', () => {
		const absolutePath = path.join(__dirname, 'autoload-sync/sync.js');
		// Reset to test absolute path handling
		app.customHoistedVarFromAutoload = false;
		app.require(absolutePath);
		expect(app.customHoistedVarFromAutoload).toBe(true);
	});
});

describe('spawnpoint.debug', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
	});

	it('returns this for chaining when debug is disabled', () => {
		app.config.debug = false;
		const result = app.debug('test message');
		expect(result).toBe(app);
	});

	it('logs and returns this when debug is enabled', () => {
		app.config.debug = true;
		const result = app.debug('debug message', { extra: 'data' });
		expect(result).toBe(app);
	});
});

describe('spawnpoint.setupJSONHandler', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
	});

	it('returns this for chaining', () => {
		const result = app.setupJSONHandler();
		expect(result).toBe(app);
	});

	it('allows requiring JSON with comments', () => {
		app.setupJSONHandler();
		// The JSON handler should now be set up
		// This is tested more thoroughly in jsonHandler.mjs
	});
});

describe('spawnpoint.initCodes', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
	});

	it('initializes codes from internal codes folder', () => {
		app.initCodes();
		// Should have system codes like spawnpoint.already_setup
		expect(app.codes['spawnpoint.already_setup']).toBeDefined();
	});

	it('emits app.setup.initCodes event', () => new Promise((resolve) => {
		app.on('app.setup.initCodes', () => {
			resolve();
		});
		app.initCodes();
	}));

	it('returns this for chaining', () => {
		const result = app.initCodes();
		expect(result).toBe(app);
	});
});

describe('spawnpoint event methods return this', () => {
	it('log returns this', () => {
		const app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		const result = app.log('test');
		expect(result).toBe(app);
	});

	it('info returns this', () => {
		const app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		const result = app.info('test');
		expect(result).toBe(app);
	});

	it('warn returns this', () => {
		const app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		const result = app.warn('test');
		expect(result).toBe(app);
	});

	it('error returns this', () => {
		const app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		const result = app.error('test');
		expect(result).toBe(app);
	});

	it('registerError returns this', () => {
		const app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		app.initCodes();
		const result = app.registerError('test.code', Error);
		expect(result).toBe(app);
	});

	it('registerErrors returns this', () => {
		const app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		app.initCodes();
		const result = app.registerErrors({ 'test.code2': Error });
		expect(result).toBe(app);
	});

	it('registerLimit returns this', () => {
		const app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		app.initCodes();
		const result = app.registerLimit('test.code', 1, () => {});
		expect(result).toBe(app);
	});
});
