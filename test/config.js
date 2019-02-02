'use strict';

const expect = require('unexpected');
const spawnpoint = require('..');

describe('spawnpoint.initConfig', () => {
	it('successfully takes a configFile in the constructor', () => {
		const app = new spawnpoint('config/app');
		app.initConfig();
		expect(app.config, 'to satisfy', {
			name: expect.it('to be', "Simple, no extras"),
			log: expect.it('to be null'),
			signals: expect.it('to be null'),
			catchExceptions: expect.it('to be false')
		});
	});

	it('should reassign a configFile if passed', () => {
		const app = new spawnpoint('config/app');
		app.initConfig('config/limitErrors.json');
		expect(app.config, 'to satisfy', {
			name: expect.it('to be', "Simple, tracking errors."),
			log: expect.it('to be null'),
			signals: expect.it('to be null'),
			catchExceptions: expect.it('to be false'),
			trackErrors: expect.it('to be true')
		});
	});

	it('automatically sets a configOverride if needed', () => {
		const app = new spawnpoint('config/debugEnabled');
		app.initConfig();
		expect(app.config, 'to satisfy', {
			name: expect.it('to be', 'Simple, debug mode enabled.'),
			debug: expect.it('to be true'),
			configOverride: expect.it('to be', 'dev-config.json')
		});
	});
});