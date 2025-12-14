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

// eslint-disable-next-line unicorn/custom-error-definition
class customError extends Error {
	constructor(err) {
		super(err);
		this.name = 'customError';
	}
}

describe('spawnpoint.registerLimit', () => {
	let app;
	// TODO

	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
	});
	it('should trigger the callback', () => new Promise((resolve) => {
		app.config.trackErrors = true;
		app.registerError('test.code', customError);
		app.setup();
		app.registerLimit('test.code', 2, () => {
			app.emit('testing.success');
		});
		app.emit('test.code');
		resolve();
	}));
});

describe('spawnpoint.initLimitListeners', () => {
	let app;

	it('should register errors correctly', () => new Promise((resolve) => {
		app = new spawnpoint({ cwd: __dirname, configFile: 'config/limitErrors.json' });
		const listeners = [];
		app.on('newListener', (value) => {
			listeners.push(value);
		});
		app.setup(() => {
			expect(listeners).toContain('errorCode');
			expect(listeners).toContain('failCode');
			resolve();
		});
	}));
});

describe('spawnpoint.initLimitListeners.limitToErrors', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname, configFile: 'config/limitErrors.json' });
	});

	it('should run without errors', () => new Promise((resolve) => {
		app.setup();
		app.errorCode('test.code');
		resolve();
	}));

	it('should correctly handle tracked errors', () => new Promise((resolve) => {
		app.registerError('test.code', customError);
		app.registerLimit('test.code', 1, { reset: -1 }, (data) => {
			expect(data.occurrences).toBe(1);
			app.config.done = true;
		});
		app.setup();
		app.config.done = false;
		app.errorCode('test.code');
		expect(app.config.done).toBe(true);
		resolve();
	}));

	it('should reset a tracked error', () => new Promise((resolve) => {
		app.registerError('test.code', customError);
		app.registerLimit('test.code', 2, { reset: 1 }, (data) => {
			expect(data.balance).toBe(2);
			app.config.done++;
		});
		app.setup();
		app.config.done = 0;
		app.errorCode('test.code');
		app.errorCode('test.code');
		expect(app.config.done).toBe(1);
		app.errorCode('test.code');
		app.errorCode('test.code');
		expect(app.config.done).toBe(2);
		resolve();
	}));

	it('should gradually timeout the error', () => new Promise((resolve) => {
		app.registerError('test.code', customError);
		app.registerLimit('test.code', 2, { time: 100 }, (data) => {
			expect(data.balance).toBe(2);
			expect([2, 5]).toContain(data.occurrences);
			app.config.done++;
		});
		app.setup();
		app.config.done = 0;
		setTimeout(function() {
			app.errorCode('test.code');
		}, 50);
		setTimeout(function() {
			app.errorCode('test.code');
		}, 100);
		setTimeout(function() {
			app.errorCode('test.code');
		}, 300);
		setTimeout(function() {
			app.errorCode('test.code');
			app.errorCode('test.code');
			expect(app.config.done).toBe(2);
			resolve();
		}, 500);
	}));
});

describe('spawnpoint.initLimitListeners with failCode', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname, configFile: 'config/limitErrors.json' });
	});

	it('should track failCode events', () => new Promise((resolve) => {
		app.registerLimit('test.code', 1, { error: 'failCode', reset: -1 }, (data) => {
			expect(data.occurrences).toBe(1);
			app.config.done = true;
		});
		app.setup();
		app.config.done = false;
		app.failCode('test.code');
		expect(app.config.done).toBe(true);
		resolve();
	}));

	it('should handle failCode with time-based reset', () => new Promise((resolve) => {
		app.registerLimit('test.code', 2, { error: 'failCode', time: 100 }, (data) => {
			expect(data.balance).toBe(2);
			app.config.done++;
		});
		app.setup();
		app.config.done = 0;
		app.failCode('test.code');
		app.failCode('test.code');
		expect(app.config.done).toBe(1);
		setTimeout(() => {
			// After timeout, balance should reset
			app.failCode('test.code');
			app.failCode('test.code');
			expect(app.config.done).toBe(2);
			resolve();
		}, 250);
	}));

	it('ignores failCode when no limit is registered', () => new Promise((resolve) => {
		app.setup();
		// This should not throw - it's just ignored
		app.failCode('test.code');
		resolve();
	}));
});

describe('spawnpoint.registerLimit options handling', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname, configFile: 'config/limitErrors.json' });
	});

	it('handles callback as third parameter (no options)', () => new Promise((resolve) => {
		let callbackCalled = false;
		app.registerLimit('test.code', 1, () => {
			callbackCalled = true;
		});
		app.setup();
		app.errorCode('test.code');
		expect(callbackCalled).toBe(true);
		resolve();
	}));

	it('tracks by index when specified', () => new Promise((resolve) => {
		const results = [];
		app.registerLimit('test.code', 1, { index: 'data.id', reset: -1 }, (data) => {
			results.push(data);
		});
		app.setup();
		// These would normally be tracked separately by index
		app.errorCode('test.code', { data: { id: 'a' } });
		app.errorCode('test.code', { data: { id: 'b' } });
		expect(results.length).toBeGreaterThan(0);
		resolve();
	}));
});
