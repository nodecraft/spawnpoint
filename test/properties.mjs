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

describe('spawnpoint.containerized property', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
	});

	it('returns cached value on subsequent access', () => {
		// First access triggers lazy load
		const firstAccess = app.containerized;
		// Second access returns cached value
		const secondAccess = app.containerized;
		expect(firstAccess).toBe(secondAccess);
	});

	it('allows setting containerized value', () => {
		app.containerized = true;
		expect(app.containerized).toBe(true);
		expect(app._containerized).toBe(true);

		app.containerized = false;
		expect(app.containerized).toBe(false);
	});

	it('is enumerable', () => {
		const keys = Object.keys(app);
		expect(keys).toContain('containerized');
	});
});

describe('spawnpoint.configBlocklist property', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
	});

	it('lazy loads config blocklist on first access', () => {
		const blocklist = app.configBlocklist;
		expect(blocklist).toBeDefined();
		expect(blocklist.env).toBeDefined();
		expect(blocklist.secrets).toBeDefined();
		expect(blocklist.args).toBeDefined();
	});

	it('returns cached blocklist on subsequent access', () => {
		const first = app.configBlocklist;
		const second = app.configBlocklist;
		expect(first).toBe(second);
	});

	it('allows setting configBlocklist value', () => {
		const customBlocklist = {
			env: { list: ['CUSTOM'], patterns: [] },
			secrets: { list: [], patterns: [] },
			args: { list: [], patterns: [] },
		};
		app.configBlocklist = customBlocklist;
		expect(app.configBlocklist).toBe(customBlocklist);
	});

	it('is enumerable', () => {
		const keys = Object.keys(app);
		expect(keys).toContain('configBlocklist');
	});
});

describe('spawnpoint lazy-loaded properties', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		app.initCodes();
	});

	it('_errorCode is lazy loaded and cached', () => {
		const errorCode = app._errorCode;
		expect(errorCode).toBeDefined();
		expect(typeof errorCode).toBe('function');
		// Second access returns same reference
		expect(app._errorCode).toBe(errorCode);
	});

	it('_failCode is lazy loaded and cached', () => {
		const failCode = app._failCode;
		expect(failCode).toBeDefined();
		expect(typeof failCode).toBe('function');
		// Second access returns same reference
		expect(app._failCode).toBe(failCode);
	});

	it('_roundRobin is lazy loaded and cached', () => {
		const roundRobin = app._roundRobin;
		expect(roundRobin).toBeDefined();
		expect(typeof roundRobin).toBe('function');
		// Second access returns same reference
		expect(app._roundRobin).toBe(roundRobin);
	});

	it('_getAndLock is lazy loaded and cached', () => {
		const getAndLock = app._getAndLock;
		expect(getAndLock).toBeDefined();
		expect(typeof getAndLock).toBe('function');
		// Second access returns same reference
		expect(app._getAndLock).toBe(getAndLock);
	});
});
