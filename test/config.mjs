import path from 'node:path';
import { fileURLToPath } from 'node:url';

import async from 'async';
import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import spawnpoint from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('spawnpoint.initConfig', () => {
	it('successfully takes a configFile in the constructor', () => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/app' });
		app.initConfig();
		expect(app.config.name).toBe('Simple, no extras');
		expect(app.config.log).toBeNull();
		expect(app.config.signals).toBeNull();
		expect(app.config.catchExceptions).toBe(false);
	});

	it('should reassign a configFile if passed', () => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/app' });
		app.initConfig('config/limitErrors.json');
		expect(app.config.name).toBe('Simple, tracking errors.');
		expect(app.config.log).toBeNull();
		expect(app.config.signals).toBeNull();
		expect(app.config.catchExceptions).toBe(false);
		expect(app.config.trackErrors).toBe(true);
	});

	it('automatically sets a configOverride if needed', () => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/debugEnabled' });
		app.initConfig();
		expect(app.config.name).toBe('Simple, debug mode enabled.');
		expect(app.config.debug).toBe(true);
		expect(app.config.configOverride).toBe('dev-config.json');
	});

	it('resets config blocklist options', () => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/resetConfigBlocklist' });
		app.initConfig();
		expect(app.config.name).toBe('Simple, resetting the config blocklist.');
		expect(app.config.resetConfigBlockListDefaults).toBe(true);
		for (const blocklist of Object.values(app.configBlocklist)) {
			for (const list of Object.values(blocklist)) {
				expect(list).toHaveLength(0);
			}
		}
	});

	it('is able to add a blocklist option', () => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/configBlocklisting.json' });
		app.initConfig();
		expect(app.config.name).toBe('Simple, with a config blocklist.');
		expect(app.configBlocklist.env.list).toContain('PATH');
	});

	it('successfully registers helper methods', () => new Promise((resolve, reject) => {
		const app = new spawnpoint({ cwd: __dirname });
		app.initConfig();
		expect(app.config.get('codes')).toBe('/config/codes');
		expect(app.config.has('log.format')).toBe(false);
		app.initCodes();
		expect(() => {
			app.config.getRandom('log.format');
		}).toThrow();
		app.config.numArray = [1, 2, 3, 4, 5];
		expect(app.config.numArray).toContain(app.config.getRandom('numArray'));
		let used = [];
		_.times(app.config.numArray.length, () => {
			const item = app.config.getRoundRobin('numArray');
			expect(app.config.numArray).toContain(item);
			expect(used).not.toContain(item);
			used.push(item);
		});

		used = {};
		async.times(app.config.numArray.length * 15, (i, cb) => {
			app.config.getAndLock('numArray', (err, results, clear) => {
				if (err) { return cb(err); }
				if (used[results]) {
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
		}, (err) => {
			if (err) { return reject(err); }
			resolve();
		});
	}));
});

describe('spawnpoint.loadConfig', () => {
	it('loads a plugin\'s configs', () => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/loadPlugins' });
		app.initConfig();
		app.loadPlugins();
		app.loadConfig();
		expect(app.config.test).toMatchObject({
			test: false,
			name: 'TestThing',
		});
	});
});
