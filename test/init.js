'use strict';
const assert = require('assert');
const expect = require('unexpected').clone().use(require('unexpected-eventemitter'));
const spawnpoint = require('..');
const _ = require('lodash');

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

describe('spawnpoint registry', () => {
	let app;
	beforeEach('initialization of app', () => {
		app = new spawnpoint();
		app.initRegistry();
	});
	describe('app.register', () => {
		it('registers a plugin if it isn\'t already on the list', (done) => {
			app.on('app.register', (data) => {
				expect(app.register, 'to contain', data);
			});
			app.emit('app.register', "spawnpoint-redis");
			done();
		});

		it('does not duplicate a plugin already on the list', (done) => {
			app.on('app.register', () => {
				expect(app.register, 'to have length', 1);
			});
			app.emit('app.register', "spawnpoint-redis");
			app.emit('app.register', "spawnpoint-redis");
			done();
		});
	});

	describe('app.deregister', () => {
		beforeEach(() => {
			app.emit('app.register', "spawnpoint-redis");
			app.emit('app.register', "lodash");
		});
		it('app.deregister removes a plugin if it is on the list', (done) => {
			app.on('app.deregister', (data) => {
				expect(app.register, 'not to contain', data);
			});
			app.emit('app.deregister', 'spawnpoint-redis');
			done();
		});
		it('does not remove an item if no match is found', (done) => {
			app.on('app.deregister', () => {
				expect(app.register, 'to have length', 1);
			});
			app.emit('app.deregister', 'spawnpoint-redis');
			app.emit('app.deregister', 'spawnpoint-redis');
			done();
		});
		it('gracefully exits if no items in registry and app is not running', (done) => {
			app.removeAllListeners('app.exit');
			expect(() => app.emit('app.deregister', 'spawnpoint-redis'), 'not to emit from', app, 'app.exit');
			expect(() => app.emit('app.deregister', 'lodash'), 'to emit from', app, 'app.exit', expect.it('to be true'));
			done();
		});
		it('does not exit if no items in registry and app is running', (done) => {
			app.removeAllListeners('app.exit');
			app.emit('app.deregister', 'spawnpoint-redis');
			app.status.running = true;
			expect(() => app.emit('app.deregister', 'lodash'), 'not to emit from', app, 'app.exit');
			done();
		});
	});

	describe('app.ready', () => {
		// I would add this to the previous definition, if I could find it.
		it('sets status.running to true', (done) => {
			app.on('app.ready', () => {
				expect(app.status.running, 'to be true');
			});
			app.emit('app.ready');
			done();
		});
		it('does not add a listener to process\'s uncaughtException event if catchExceptions is false', (done) => {
			app.config.catchExceptions = false;
			expect(() => app.emit('app.ready'), 'not to emit from', process, 'newListener');
			done();
		});
		it('adds a listener to process\'s uncaughtException event if catchExceptions is true', (done) => {
			app.config.catchExceptions = true;
			expect(() => app.emit('app.ready'), 'to emit from', process, 'newListener', 'uncaughtException');
			done();
		});
		it('after app.ready is called with catchExceptions being true, stops the app if an uncaughtException is emitted on process and app.status.running is false', (done) => {
			app.config.catchExceptions = true;
			app.removeAllListeners('app.stop');
			const originalListeners = process.listeners('uncaughtException');
			process.removeAllListeners('uncaughtException'); // prevents the exception from throwing. This is dangerous.
			app.on('app.ready', () => {
				app.status.running = false;
				expect(() => process.emit('uncaughtException', new Error('Test error')), 'to emit from', app, 'app.stop', expect.it('to be true'));
			});
			app.emit('app.ready');
			_.eachRight(originalListeners, (item) => process.prependListener('uncaughtException', item)); // Adding the original listeners back to process's uncaughtException. Hopefully makes this less dangerous.
			done();
		});
	});

	describe('app.stop', () => {
		beforeEach(() => {
			// prevent timing out due to process.exit() being called before testing finishes.
			app.removeAllListeners('app.exit');
		});
		it('sets values correctly and calls app.close', (done) => {
			app.status.running = true;
			app.register.push("lodash");
			app.info = function(message, argument){
				// mock this to see if it gets the correct values.
				expect(message, 'to equal', 'Stopping %s gracefully');
				expect(argument, 'to equal', app.config.name);
			};
			app.on('app.stop', () => {
				expect(app.status.running, 'to be false');
				expect(app.status.stopping, 'to be true');
			});
			expect(() => app.emit('app.stop'), 'to emit from', app, 'app.close');
			done();
		});
		it('calls app.exit if nothing is in the registry', (done) => {
			expect(() => app.emit('app.stop'), 'to emit from', app, 'app.exit');
			done();
		});
		it('does not call app.exit if something is in the registry', (done) => {
			app.register.push("lodash");
			expect(() => app.emit('app.stop'), 'not to emit from', app, 'app.exit');
			done();
		});
		_.times(6, (inde) => {
			let index = inde + 1;
			let runs = index % 3;
			runs += 2;
			index %= 2;
			index += 2;
			if(runs >= index){
				it('with ' + index + ' stopAttempts forcefully stops once app.stop is called ' + index + ' times', (done) => {
					app.register.push("lodash"); // make sure the other way app.exit can be called doesn't happen.
					app.config.stopAttempts = index;
					_.times(index, () => expect(() => app.emit('app.stop'), 'not to emit from', app, 'app.exit'));
					expect(() => app.emit('app.stop'), 'to emit from', app, 'app.exit');
					done();
				});
			}
			if(runs < index){
				it('with ' + index + ' stopAttempts never stops with app.stop being called ' + runs + ' times', (done) => {
					app.register.push("lodash"); // make sure the other way app.exit can be called doesn't happen.
					app.config.stopAttempts = index;
					_.times(runs, () => expect(() => app.emit('app.stop'), 'not to emit from', app, 'app.exit'));
					done();
				});
			}
		});
	});

	describe.skip('app.exit');

	describe('initialization', () => {
		beforeEach(() => {
			app = new spawnpoint();
			app.config.signals = {};
		});
		it('emits a signal once done', (done) => {
			expect(() => app.initRegistry(), 'to emit from', app, 'app.setup.initRegistry');
			done();
		});

		it('accepts configuration options for events that close the app', (done) => {
			// Testing with SIGINT caused bad things.
			app.config.signals.close = ['SIGUSR1'];
			app.config.signals.debug = [];
			expect(() => app.initRegistry(), 'to emit from', process, 'newListener', 'SIGUSR1');
			app.removeAllListeners('app.stop');
			expect(() => process.emit('SIGUSR1'), 'to emit from', app, 'app.stop');
			done();
		});

		it('accepts configuration options for events that toggle debug mode', (done) => {
			app.config.signals.close = [];
			app.config.signals.debug = ['SIGUSR1'];
			app.config.debug = false;
			expect(() => app.initRegistry(), 'to emit from', process, 'newListener', 'SIGUSR1');
			expect(() => { return process.emit('SIGUSR1'); }, 'when called').then((result) => {
				expect(result, 'to be true').and('to equal', app.config.debug);
				done();
			});
		});
	});
});