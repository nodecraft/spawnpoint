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

describe('spawnpoint.loadPlugins', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint({ cwd: __dirname, configFile: 'config/loadPlugins.json' });
	});

	it('should create an array of plugins', function() {
		return new Promise((resolve) => {
			app.setup(() => {
				app.on('app.setup.loadPlugins', () => {
					expect(app.config.plugins).toBeInstanceOf(Array);
					expect(app.config.plugins).toEqual(
						expect.arrayContaining([
							expect.objectContaining({
								name: 'TestWCallback',
								namespace: 'test',
								original_namespace: 'test',
							}),
						]),
					);
					expect(app.config.plugins).toEqual(
						expect.arrayContaining([
							expect.objectContaining({
								name: 'test',
								namespace: 'testB',
								original_namespace: 'testB',
							}),
						]),
					);
					resolve();
				});
				app.loadPlugins();
			});
		});
	});
});

describe('spawnpoint.loadPlugins sideloading', () => {
	it('should handle plugin sideloading with custom namespace', () => new Promise((resolve) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/pluginSideload.json' });
		app.initConfig();
		app.initCodes();
		app.initRegistry();
		app.loadPlugins();

		// Check that plugin was sideloaded with custom namespace
		expect(app.plugins.customNamespace).toBeDefined();
		expect(app.plugins.customNamespace.original_namespace).toBe('testB');
		resolve();
	}));

	it('handles string plugin format', () => new Promise((resolve) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/loadPlugins.json' });
		app.initConfig();
		app.initCodes();
		app.initRegistry();
		app.loadPlugins();

		// String format plugin should be loaded
		expect(app.plugins.testB).toBeDefined();
		resolve();
	}));
});
