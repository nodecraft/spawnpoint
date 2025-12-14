'use strict';

const { fork } = require('node:child_process');

const deepVoid = require(__dirname + '/deepVoid');
const _ = require('lodash');
const voidBridge = require(__dirname + '/voidBridge');

class ProcessVoid {
	/**
	 *
	 * @param {callback} callback Called when void.done() is called.
	 * @param {String} targetClass Module to clone into a child process
	 * @param {Object} options Options object.
	 * @param  {...any} args Args to pass into the modules constructor.
	 */
	constructor(callback, targetClass, options, ...args) {
		const targetProto = require(targetClass);
		const target = (options.construct) ? new targetProto(...args) : targetProto;

		const self = {};
		const forkOptions = {
			silent: true,
			cwd: options.cwd || process.cwd(),
		};
		if (typeof(callback) === 'function') {
			self.callback = callback;
		} else {
			self.callback = () => {};
		}

		if (typeof(process.getuid) === 'function') {
			if (process.getuid() !== 0) {
				forkOptions.gid = process.getgid();
				forkOptions.uid = process.getuid();
			} else {
				forkOptions.gid = (options.runAsRoot) ? 0 : 1000;
				forkOptions.uid = (options.runAsRoot) ? 0 : 1000;
			}
		}
		self.void = fork(__dirname + '/processVoid.js', [targetClass, Boolean(options.construct), ...args], forkOptions);
		target.stdio = self.void.stdio;
		target.stdout = target.stdio[1];
		target.stderr = target.stdio[2];
		self.bridge = new voidBridge(targetClass, self.void);
		self.bridge.setup();
		self.bridge.on('exit', self.callback);
		if (options.debug) {
			self.debug = function(data) {
				if (Buffer.isBuffer(data)) {
					console.log(data.toString('utf8'));
				}
				console.log(data);
			};
			self.void.stderr.on('data', data => self.debug(data));
			self.void.stdout.on('data', data => self.debug(data));
			self.bridge.on('results', id => console.log(id));
			console.log(self.bridge);
		} else {
			self.debug = function() {};
		}
		const setHandler = {
			set: async function(target, key, value) {
				self.debug(key + ': ' + value);
				return await deepVoid.sendSet(self, key, value);
			},
		};
		this.set = new Proxy({}, setHandler);

		target.done = function() {
			self.bridge.removeListener('exit', self.callback);
			if (!self.bridge.exited) {
				self.void.disconnect();
			}
			self.callback();
		};

		const appHandler = {
			get: function(target, prop/*, receiver*/) {
				if (typeof prop === 'string') {
					self.debug('String: ' + prop);
				} else if (typeof prop === 'symbol') {
					self.debug('Symbol: ' + prop.toString());
				}
				if (prop === 'done') {
					return target.done;
				} else if (prop === 'stdout') {
					return target.stdout;
				} else if (prop === 'stderr') {
					return target.stderr;
				} else if (prop === 'exited') {
					return self.bridge.exited;
				} else if (_.hasIn(target, prop)) {
					self.debug('target has property ' + prop.toString());
					if (typeof(target[prop]) === 'function') {
						self.debug('target has function ' + prop.toString());
						let run = new Proxy(target[prop], ProcessVoid.getRunHandler(self));
						self.debug(run);
						run = run.bind(null, prop);
						self.debug(run);
						return run;
					} else if (typeof(target[prop]) === 'object') {
						self.debug('target has object ' + prop.toString());
						return new Proxy(target[prop], new deepVoid(self, [prop]).handler);
					}
					// Do nothing for now
				} else {
					self.debug('target does not have property ' + prop.toString());
					self.debug('target has properties: ');
					self.debug(_.mapValues(target, value => typeof value));
					self.debug('target\'s prototype properties are: ');
					self.debug(_.keysIn(target));
				}
			},
			set: async function(target, key, value) {
				self.debug(key + ': ' + value);
				return await deepVoid.sendSet(self, key, value);
				/*deepVoid.sendSet(self, key, value).then(() => {
					return true;
				}).catch((err) => {
					console.log(err);
					return false;
				});*/
				//return self.void.send({'set': {'key': key, 'value': value}});
			},
		};

		this.app = new Proxy(target, appHandler);

		process.on('beforeExit', () => {
			if (!self.bridge.exited) {
				self.void.disconnect();
			}
		});



		return this.app;
	}

	static getRunHandler(self) {
		return {
			apply: function(target, thisArg, [path, ...args]) {
				/*let applyOptions = { 'command': path };
				if(args){
					applyOptions.args = args;
				}
				self.debug(applyOptions);
				return new Promise((resolve) => {
					self.void.once('message', (data) => {
						if(data === 'void'){
							resolve();
						}/*else if(data === 'void false'){
							resolve(false);
						}else{
							self.debug(data);
							resolve(data);
						}
					});
					self.void.send(applyOptions);
				});*/
				return new Promise((resolve) => {
					const resultsID = self.bridge.run(path, ...args);
					self.bridge.once(`results_${resultsID}`, () => {
						resolve(self.bridge.results[resultsID]);
					});
				});
			},
		};
	}
}

module.exports = ProcessVoid;
