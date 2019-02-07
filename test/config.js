'use strict';

const expect = require('unexpected');
const spawnpoint = require('..');
const _ = require('lodash');
const async = require('async');

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

	it('resets config blacklist options', () => {
		const app = new spawnpoint('config/resetConfigBlacklist');
		app.initConfig();
		expect(app.config, 'to satisfy', {
			name: expect.it('to be', 'Simple, resetting the config blacklist.'),
			resetConfigBlackListDefaults: expect.it('to be true')
		});
		expect(app.configBlacklist, 'to have values satisfying', 'to have values satisfying', 'to be empty');
	});

	it('is able to add a blacklist option', () => {
		const app = new spawnpoint('config/configBlacklisting.json');
		app.initConfig();
		expect(app.config, 'to satisfy', {
			name: expect.it('to be', 'Simple, with a config blacklist.')
		});
		expect(app.configBlacklist.env.list, 'to have an item satisfying', 'to equal', 'PATH');
	});

	it('successfully registers helper methods', (done) => {
		const app = new spawnpoint();
		app.initConfig();
		expect(app.config.get, 'when called with', ['codes'], 'to equal', '/config/codes');
		expect(app.config.has, 'when called with', ['log.format'], 'to be false');
		app.initCodes();
		expect(() => { app.config.getRandom('log.format'); }, 'to throw');
		app.config.numArray = [1, 2, 3, 4, 5];
		expect(app.config.getRandom, 'when called with', ['numArray'], 'to be one of', app.config.numArray);
		let used = [];
		_.times(app.config.numArray.length, () => {
			let item = app.config.getRoundRobin('numArray');
			expect(item, 'to be one of', app.config.numArray).and('not to be one of', used);
			used.push(item);
		});

		used = {};
		async.times(app.config.numArray.length * 15, (i, cb) => {
			app.config.getAndLock('numArray', (err, results, clear) => {
				if(err){ return cb(err); }
				if(used[results]){
					clear();
					return cb(new Error('Returned another result that is already in use.'));
				}
				used[results] = true;
				setTimeout(() => {
					used[results] = false;
					clear();
					return cb();
				}, _.random(10, 75));
			});
		}, done);
	});
});

describe('spawnpoint.loadConfig', () => {
	it('loads a plugin\'s configs', () => {
		const app = new spawnpoint('config/loadPlugins');
		app.initConfig();
		app.loadPlugins();
		app.loadConfig();
		expect(app.config.test, 'to satisfy', {
			test: false,
			name: 'TestThing'
		});
	});
});