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

describe('spawnpoint.registerConfig', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname, configFile: 'config/blocklistPatterns.json' });
		app.initConfig();
	});

	it('registers config without blocklist check', () => {
		app.registerConfig('myKey', 'myValue');
		expect(app.config.myKey).toBe('myValue');
	});

	it('blocks config in env blocklist by name', () => {
		const result = app.registerConfig('BLOCKED_VAR', 'should-be-blocked', 'env');
		expect(app.config.BLOCKED_VAR).toBeUndefined();
		expect(result).toBe(app); // returns this from debug()
	});

	it('blocks config matching env blocklist pattern', () => {
		app.registerConfig('SECRET_KEY', 'should-be-blocked', 'env');
		expect(app.config.SECRET_KEY).toBeUndefined();

		app.registerConfig('PRIVATE_TOKEN', 'should-be-blocked', 'env');
		expect(app.config.PRIVATE_TOKEN).toBeUndefined();
	});

	it('allows config not in blocklist', () => {
		app.registerConfig('ALLOWED_VAR', 'allowed-value', 'env');
		expect(app.config.ALLOWED_VAR).toBe('allowed-value');
	});

	it('handles args blocklist', () => {
		app.registerConfig('blocked-arg', 'blocked', 'args');
		expect(app.config['blocked-arg']).toBeUndefined();

		app.registerConfig('secret-password', 'blocked', 'args');
		expect(app.config['secret-password']).toBeUndefined();
	});

	it('handles secrets blocklist', () => {
		app.registerConfig('api_key_main', 'blocked', 'secrets');
		expect(app.config.api_key_main).toBeUndefined();
	});

	it('uses _.set for env/secrets/config-hoist', () => {
		app.registerConfig('nested.deep.value', 'test-value', 'env');
		expect(app.config.nested.deep.value).toBe('test-value');

		app.registerConfig('another.nested', 'secret-value', 'secrets');
		expect(app.config.another.nested).toBe('secret-value');

		app.registerConfig('hoist.value', 'hoisted', 'config-hoist');
		expect(app.config.hoist.value).toBe('hoisted');
	});

	it('merges config when name is object and config is falsy', () => {
		app.registerConfig({ mergedKey: 'mergedValue' });
		expect(app.config.mergedKey).toBe('mergedValue');
	});
});

describe('spawnpoint.registerConfig with debug mode', () => {
	it('logs when setting env variable in debug mode', () => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/debugEnabled.json' });
		app.initConfig();
		// In debug mode, setting an allowed env var should log
		app.registerConfig('DEBUG_TEST_VAR', 'debug-value', 'env');
		expect(app.config.DEBUG_TEST_VAR).toBe('debug-value');
	});
});
