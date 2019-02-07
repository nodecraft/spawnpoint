'use strict';
const expect = require('unexpected');
const spawnpoint = require('..');

describe('spawnpoint.loadPlugins', () => {
	let app;
	const config = './config/loadPlugins.json';
	beforeEach(() => {
		app = new spawnpoint(config);
	});

	it('should create an array of plugins', function(done){
		app.setup(() => {
			app.on('app.setup.loadPlugins', () => {
				expect(app.config.plugins, 'to be an', 'array');
				expect(app.config.plugins, 'to have an item satisfying', 'to satisfy', {
					plugin: expect.it('to contain', 'spawnpoint-test-cb'),
					name: expect.it('to be', 'TestWCallback'),
					namespace: expect.it('to be', 'test'),
					original_namespace: expect.it('to be', 'test')
				});
				expect(app.config.plugins, 'to have an item satisfying', 'to satisfy', {
					plugin: expect.it('to contain', 'spawnpoint-test'),
					name: expect.it('to be', 'test'),
					namespace: expect.it('to be', 'testB'),
					original_namespace: expect.it('to be', 'testB')
				});
				done();
			});
			app.loadPlugins();
		});
	});
});