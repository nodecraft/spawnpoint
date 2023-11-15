'use strict';
const assert = require('node:assert');

const spawnpoint = require('..');

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

		assert.deepStrictEqual(results, spawnpoint.registerPlugin({
			dir: __dirname,
			name: 'Text Plugin',
			namespace: 'testPlugin',
			exports: pluginFn,
		}));
	});
});


// TODO mock require and testing a plugin loading via sync/async
