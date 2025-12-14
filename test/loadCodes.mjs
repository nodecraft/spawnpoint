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

describe('spawnpoint.loadCodes', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		app.initCodes();
	});

	it('loads codes from plugin with codes property', () => {
		app.plugins = {
			test: {
				codes: {
					'plugin.custom_code': 'Custom code from plugin',
				},
				dir: __dirname,
			},
		};
		app.loadCodes();
		expect(app.codes['plugin.custom_code']).toBe('Custom code from plugin');
	});

	it('handles missing codes folder gracefully', () => {
		app.config.codes = '/non-existent-codes-folder';
		// Should not throw
		app.loadCodes();
	});

	it('emits app.setup.loadCodes event', () => new Promise((resolve) => {
		app.on('app.setup.loadCodes', () => {
			resolve();
		});
		app.loadCodes();
	}));

	it('loads codes from a specified directory', () => {
		// Load codes from a specific path
		const codesDir = path.join(__dirname, 'config/codes');
		app.loadCodes(codesDir);
		// Codes should include test codes from config/codes
		expect(app.codes['test.code']).toBeDefined();
	});
});

describe('spawnpoint.registerCodes', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		app.initCodes();
	});

	it('registers new codes', () => {
		app.registerCodes({
			'new.code': 'New code message',
			'another.code': 'Another code message',
		});
		expect(app.codes['new.code']).toBe('New code message');
		expect(app.codes['another.code']).toBe('Another code message');
	});

	it('returns this for chaining', () => {
		const result = app.registerCodes({ 'chain.code': 'Chain test' });
		expect(result).toBe(app);
	});
});
