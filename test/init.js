'use strict';
const assert = require('assert');
const spawnpoint = require('..');

process.chdir(__dirname);
describe('spawnpoint initialization', () => {

	it('Successfully initializes', () => {
		assert.doesNotThrow(() => new spawnpoint());
		assert.doesNotThrow(() => new spawnpoint('config/app.json'));
	});

	it('fails with bad configFile', () => {
		assert.throws(() => new spawnpoint({invalid: 'object'}), Error);
		assert.throws(() => new spawnpoint(['invalid', 'array']), Error);
		assert.throws(() => new spawnpoint(null), Error);
		assert.throws(() => new spawnpoint(true), Error);
	});
});

describe('spawnpoint setup', () => {

	it('Basic startup', (done) => {
		const app = new spawnpoint();
		app.setup(done);
	});
	it('Basic startup without .json extension', (done) => {
		const app = new spawnpoint('config/app');
		app.setup(done);
	});
	it('Basic startup with path', (done) => {
		const app = new spawnpoint('config/app.json');
		app.setup(done);
	});
	it('Basic startup with /path', (done) => {
		const app = new spawnpoint('/config/app.json');
		app.setup(done);
	});

	it('Throws when setup is run more than once', (done) => {
		const app = new spawnpoint();
		app.setup();
		app.setup((err) => {
			assert(err && err.code === 'spawnpoint.already_setup');
			done();
		});
	});

	it('sync autoloading', (done) => {
		const app = new spawnpoint('config/autoloading-sync.json');
		app.setup((err) => {
			if(err){ return done(err); }
			assert(app.customHoistedVarFromAutoload);
			done();
		});
	});

	it('async autoloading', (done) => {
		const app = new spawnpoint('config/autoloading-async.json');
		app.setup((err) => {
			if(err){ return done(err); }
			assert(app.customHoistedVarFromAutoload);
			done();
		});
	});
});