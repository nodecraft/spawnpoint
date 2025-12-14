'use strict';
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
	test: {
		globals: false,
		testTimeout: 10000,
		hookTimeout: 10000,
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		fileParallelism: false,
		include: ['test/**/*.mjs'],
		exclude: [
			'test/process-void/**',
			'test/autoload-*/**',
			'test/config/**',
			'test/store/**',
			'test/json/**',
			'test/spawnpoint-test/**',
			'test/spawnpoint-test-cb/**',
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			reportsDirectory: './coverage',
			include: ['lib/**/*.js', 'index.js'],
		},
	},
});
