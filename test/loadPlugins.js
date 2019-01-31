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
					plugin: expect.it('to be', 'spawnpoint-redis'),
					name: expect.it('to be', 'Redis'),
					namespace: expect.it('to be', 'redis'),
					original_namespace: expect.it('to be', 'redis')
				});
				done();
			});
			app.loadPlugins();
		});
	});
});