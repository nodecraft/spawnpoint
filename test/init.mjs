import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import _ from 'lodash';
import {
	beforeEach,
	describe,
	expect,
	it,
} from 'vitest';

import spawnpoint from '../index.js';
import processVoid from './process-void/void.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

describe('spawnpoint initialization', () => {
	it('Successfully initializes', () => {
		expect(() => new spawnpoint()).not.toThrow();
		expect(() => new spawnpoint('config/app.json')).not.toThrow();
	});

	it('fails with bad configFile', () => {
		expect(() => new spawnpoint(['invalid', 'array'])).toThrow(Error);
		expect(() => new spawnpoint(null)).toThrow(Error);
		expect(() => new spawnpoint(true)).toThrow(Error);
		// Note: objects are now valid as options (e.g., { cwd: '/path' })
	});

	it('accepts options object with cwd', () => {
		const app = new spawnpoint({ cwd: __dirname });
		expect(app.cwd).toBe(__dirname);
	});

	it('accepts options object with configFile', () => {
		const app = new spawnpoint({ configFile: '/custom/config.json' });
		expect(app.configFile).toBe('/custom/config.json');
	});

	it('defaults cwd to process.cwd() when not specified', () => {
		const app = new spawnpoint();
		expect(app.cwd).toBe(process.cwd());
	});

	it('uses cwd from options object for config file resolution', () => new Promise((resolve) => {
		// This test verifies that passing cwd allows loading configs from that directory
		// without needing process.chdir()
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/app.json' });
		app.setup((err) => {
			expect(err).toBeFalsy();
			expect(app.config.name).toBe('Simple, no extras');
			resolve();
		});
	}));

	it('combines cwd and configFile options correctly', () => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/debugEnabled.json' });
		expect(app.cwd).toBe(__dirname);
		expect(app.configFile).toBe('config/debugEnabled.json');
	});

	it('supports legacy string configFile parameter', () => {
		const app = new spawnpoint('/config/app.json');
		expect(app.configFile).toBe('/config/app.json');
		expect(app.cwd).toBe(process.cwd());
	});
});

describe('spawnpoint setup', () => {
	it('Basic startup', () => new Promise((resolve) => {
		const app = new spawnpoint({ cwd: __dirname });
		app.setup(resolve);
	}));
	it('Basic startup without .json extension', () => new Promise((resolve) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/app' });
		app.setup(resolve);
	}));
	it('Basic startup with path', () => new Promise((resolve) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/app.json' });
		app.setup(resolve);
	}));
	it('Basic startup with /path', () => new Promise((resolve) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: '/config/app.json' });
		app.setup(resolve);
	}));
	it('Basic startup with plugins', () => new Promise((resolve) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/loadPlugins' });
		app.setup(resolve);
	}));

	it('Throws when setup is run more than once', () => new Promise((resolve) => {
		const app = new spawnpoint({ cwd: __dirname });
		app.setup();
		app.setup((err) => {
			expect(err).toBeTruthy();
			expect(err.code).toBe('spawnpoint.already_setup');
			resolve();
		});
	}));

	it('sync autoloading', () => new Promise((resolve, reject) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/autoloading-sync.json' });
		app.setup((err) => {
			if (err) { return reject(err); }
			expect(app.customHoistedVarFromAutoload).toBeTruthy();
			resolve();
		});
	}));

	it('async autoloading', () => new Promise((resolve, reject) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/autoloading-async.json' });
		app.setup((err) => {
			if (err) { return reject(err); }
			expect(app.customHoistedVarFromAutoload).toBeTruthy();
			resolve();
		});
	}));

	it('autoloading with folder only', () => new Promise((resolve, reject) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/autoloading-noName.json' });
		app.setup((err) => {
			if (err) { return reject(err); }
			expect(app.customHoistedVarFromAutoload).toBe(true);
			resolve();
		});
	}));

	it('sync autoloading error handles correctly', () => new Promise((resolve) => {
		const app = new processVoid(resolve, require.resolve('..'), { construct: true, cwd: __dirname }, 'config/autoloading-error.json');
		app.stderr.once('data', (data) => {
			expect(data.toString('utf8')).toContain('TypeError');
			void app.done();
		});
		app.setup();
	}));

	it('async autoloading error handles correctly', () => new Promise((resolve) => {
		const app = new spawnpoint({ cwd: __dirname, configFile: 'config/autoloading-error-async.json' });
		app.on('app.setup.initRegistry', () => {
			app.removeAllListeners('app.exit');
		});
		app.setup((err) => {
			expect(err).toBeInstanceOf(Error);
			resolve();
		});
	}));
});

describe('spawnpoint registry', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint();
		app.initRegistry();
	});
	describe('app.register', () => {
		it('registers a plugin if it isn\'t already on the list', () => new Promise((resolve) => {
			app.on('app.register', (data) => {
				expect(app.register).toContain(data);
			});
			app.emit('app.register', 'spawnpoint-redis');
			resolve();
		}));

		it('does not duplicate a plugin already on the list', () => new Promise((resolve) => {
			app.on('app.register', () => {
				expect(app.register).toHaveLength(1);
			});
			app.emit('app.register', 'spawnpoint-redis');
			app.emit('app.register', 'spawnpoint-redis');
			resolve();
		}));
	});

	describe('app.deregister', () => {
		beforeEach(() => {
			app.emit('app.register', 'spawnpoint-redis');
			app.emit('app.register', 'lodash');
		});
		it('app.deregister removes a plugin if it is on the list', () => new Promise((resolve) => {
			app.on('app.deregister', (data) => {
				expect(app.register).not.toContain(data);
			});
			app.emit('app.deregister', 'spawnpoint-redis');
			resolve();
		}));
		it('does not remove an item if no match is found', () => new Promise((resolve) => {
			app.on('app.deregister', () => {
				expect(app.register).toHaveLength(1);
			});
			app.emit('app.deregister', 'spawnpoint-redis');
			app.emit('app.deregister', 'spawnpoint-redis');
			resolve();
		}));
		it('gracefully exits if no items in registry and app is not running', () => new Promise((resolve) => {
			app.removeAllListeners('app.exit');
			let exitCalled = false;
			app.on('app.exit', () => {
				exitCalled = true;
			});
			app.emit('app.deregister', 'spawnpoint-redis');
			expect(exitCalled).toBe(false);
			app.emit('app.deregister', 'lodash');
			expect(exitCalled).toBe(true);
			resolve();
		}));
		it('does not exit if no items in registry and app is running', () => new Promise((resolve) => {
			app.removeAllListeners('app.exit');
			let exitCalled = false;
			app.on('app.exit', () => {
				exitCalled = true;
			});
			app.emit('app.deregister', 'spawnpoint-redis');
			app.status.running = true;
			app.emit('app.deregister', 'lodash');
			expect(exitCalled).toBe(false);
			resolve();
		}));
	});

	describe('app.ready', () => {
		it('sets status.running to true', () => new Promise((resolve) => {
			app.on('app.ready', () => {
				expect(app.status.running).toBe(true);
			});
			app.emit('app.ready');
			resolve();
		}));
		it('does not add a listener to process\'s uncaughtException event if catchExceptions is false', () => new Promise((resolve) => {
			app.config.catchExceptions = false;
			const listenerCountBefore = process.listenerCount('uncaughtException');
			app.emit('app.ready');
			const listenerCountAfter = process.listenerCount('uncaughtException');
			expect(listenerCountAfter).toBe(listenerCountBefore);
			resolve();
		}));
		it('adds a listener to process\'s uncaughtException event if catchExceptions is true', () => new Promise((resolve) => {
			app.config.catchExceptions = true;
			const listenerCountBefore = process.listenerCount('uncaughtException');
			app.emit('app.ready');
			const listenerCountAfter = process.listenerCount('uncaughtException');
			expect(listenerCountAfter).toBe(listenerCountBefore + 1);
			resolve();
		}));
		it('after app.ready is called with catchExceptions being true, stops the app if an uncaughtException is emitted on process and app.status.running is false', () => new Promise((resolve) => {
			app.config.catchExceptions = true;
			app.removeAllListeners('app.stop');
			const originalListeners = process.listeners('uncaughtException');
			process.removeAllListeners('uncaughtException');
			let stopCalled = false;
			app.on('app.stop', () => {
				stopCalled = true;
			});
			app.on('app.ready', () => {
				app.status.running = false;
				process.emit('uncaughtException', new Error('Test error'));
				expect(stopCalled).toBe(true);
			});
			app.emit('app.ready');
			_.eachRight(originalListeners, item => process.prependListener('uncaughtException', item));
			resolve();
		}));
	});

	describe('app.stop', () => {
		beforeEach(() => {
			app.removeAllListeners('app.exit');
		});
		it('sets values correctly and calls app.close', () => new Promise((resolve) => {
			app.status.running = true;
			app.register.push('lodash');
			app.info = function(message, argument) {
				expect(message).toBe('Stopping %s gracefully');
				expect(argument).toBe(app.config.name);
			};
			let closeCalled = false;
			app.on('app.close', () => {
				closeCalled = true;
			});
			app.on('app.stop', () => {
				expect(app.status.running).toBe(false);
				expect(app.status.stopping).toBe(true);
			});
			app.emit('app.stop');
			expect(closeCalled).toBe(true);
			resolve();
		}));
		it('calls app.exit if nothing is in the registry', () => new Promise((resolve) => {
			let exitCalled = false;
			app.on('app.exit', () => {
				exitCalled = true;
			});
			app.emit('app.stop');
			expect(exitCalled).toBe(true);
			resolve();
		}));
		it('does not call app.exit if something is in the registry', () => new Promise((resolve) => {
			app.register.push('lodash');
			let exitCalled = false;
			app.on('app.exit', () => {
				exitCalled = true;
			});
			app.emit('app.stop');
			expect(exitCalled).toBe(false);
			resolve();
		}));
		_.times(6, (inde) => {
			let index = inde + 1;
			let runs = index % 3;
			runs += 2;
			index %= 2;
			index += 2;
			if (runs >= index) {
				it('with ' + index + ' stopAttempts forcefully stops once app.stop is called ' + index + ' times', () => new Promise((resolve) => {
					app.register.push('lodash');
					app.config.stopAttempts = index;
					let exitCalled = false;
					app.on('app.exit', () => {
						exitCalled = true;
					});
					_.times(index, () => {
						app.emit('app.stop');
						expect(exitCalled).toBe(false);
					});
					app.emit('app.stop');
					expect(exitCalled).toBe(true);
					resolve();
				}));
			} else if (runs < index) {
				it('with ' + index + ' stopAttempts never stops with app.stop being called ' + runs + ' times', () => new Promise((resolve) => {
					app.register.push('lodash');
					app.config.stopAttempts = index;
					let exitCalled = false;
					app.on('app.exit', () => {
						exitCalled = true;
					});
					_.times(runs, () => {
						app.emit('app.stop');
						expect(exitCalled).toBe(false);
					});
					resolve();
				}));
			}
		});
	});

	describe('app.exit', () => {
		it('allows the process to exit gracefully', { timeout: 5000 }, () => new Promise((resolve) => {
			let message;
			const testApp = new processVoid(() => {
				expect(message.toString('utf8')).toBe('Test gracefully closed.\n');
				expect(testApp.exited).toHaveProperty('code', 0);
				resolve();
			}, require.resolve('..'), { construct: true });
			testApp.config.name = 'Test';
			testApp.config.log = { format: '{line}' };
			testApp.initRegistry();
			const date = /^\[\d{4}-[01]\d-[0-3]\dT[0-2](?:\d:[0-6]){2}\d[+-][01]\d:\d{2}]\n$/;
			testApp.stdout.once('data', (data) => {
				if (date.test(data)) {
					testApp.stdout.once('data', (data) => {
						message = data;
					});
				} else {
					message = data;
				}
			});
			testApp.emit('app.exit', true);
		}));

		it('allows the process to exit unsafely', { timeout: 5000 }, () => new Promise((resolve) => {
			const testApp = new processVoid(() => {
				expect(testApp.exited).toHaveProperty('code', 1);
				resolve();
			}, require.resolve('..'), { construct: true });
			testApp.initRegistry();
			testApp.emit('app.exit', false);
		}));
	});

	describe('initialization', () => {
		beforeEach(() => {
			app = new spawnpoint();
			app.config.signals = {};
		});
		it('emits a signal once done', () => new Promise((resolve) => {
			app.on('app.setup.initRegistry', () => {
				resolve();
			});
			app.initRegistry();
		}));

		it('accepts configuration options for events that close the app', () => new Promise((resolve) => {
			app.config.signals.close = ['SIGUSR1'];
			app.config.signals.debug = [];
			let sigusr1ListenerAdded = false;
			process.once('newListener', (event) => {
				if (event === 'SIGUSR1') {
					sigusr1ListenerAdded = true;
				}
			});
			app.initRegistry();
			expect(sigusr1ListenerAdded).toBe(true);
			app.removeAllListeners('app.stop');
			let stopCalled = false;
			app.on('app.stop', () => {
				stopCalled = true;
			});
			process.emit('SIGUSR1');
			expect(stopCalled).toBe(true);
			resolve();
		}));

		it('accepts configuration options for events that toggle debug mode', async () => {
			app.config.signals.close = [];
			app.config.signals.debug = ['SIGUSR1'];
			app.config.debug = false;
			app.initRegistry();
			const result = process.emit('SIGUSR1');
			expect(result).toBe(true);
			expect(app.config.debug).toBe(true);
		});
	});
});
