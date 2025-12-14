import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import spawnpoint from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('plugin registration', () => {
	it('registers sync plugin', () => {
		const pluginFn = function(app) {
			app.config[this.namespace] = true;
		};

		const results = {
			dir: __dirname,
			name: 'Text Plugin',
			namespace: 'testPlugin',
			exports: pluginFn,
			codes: null,
			config: null,
		};

		expect(spawnpoint.registerPlugin({
			dir: __dirname,
			name: 'Text Plugin',
			namespace: 'testPlugin',
			exports: pluginFn,
		})).toEqual(results);
	});

	it('throws without required name option', () => {
		const pluginFn = function(app) {
			app.config[this.namespace] = true;
		};

		expect(() => spawnpoint.registerPlugin({
			dir: __dirname,
			namespace: 'testPlugin',
			exports: pluginFn,
		})).toThrow('Plugin is missing required `name` option.');
	});

	it('throws without required namespace option', () => {
		const pluginFn = function(app) {
			app.config[this.namespace] = true;
		};

		expect(() => spawnpoint.registerPlugin({
			dir: __dirname,
			name: 'Test Plugin',
			exports: pluginFn,
		})).toThrow('Plugin is missing required `namespace` option.');
	});

	it('throws without required exports option', () => {
		expect(() => spawnpoint.registerPlugin({
			dir: __dirname,
			name: 'Test Plugin',
			namespace: 'testPlugin',
		})).toThrow('Plugin is missing required `exports` function.');
	});
});
