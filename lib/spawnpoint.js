'use strict';

// Include core libs
const assert = require('node:assert');
const child_process = require('node:child_process');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { format } = require('node:util');

// Include external libraries
const async = require('async');
const kleur = require('kleur');
const _ = require('lodash');
const minimist = require('minimist');
const { nanoid } = require('nanoid');

// Define private helper functions
const helpers = require('./helpers.js');

/**
 * Agnostic JS framework that empowers devs to focus on quickly building apps, rather than focusing on application
 * config, health-checks, application structure, or architecture to build a 12 factor app in Docker.
 *
 * Spawnpoint can be configured to manage the entire application life-cycle or standalone as a utility library.
 * @class
 */
class spawnpoint extends EventEmitter {
	/**
	 * Creates new instance of spawnpoint
	 * @param  {string} [configFile] Sets the JSON file spawnpoint uses to setup the framework.
	 * @return {this}
	 */
	constructor(configFile = '/config/app.json') {
		// init EventEmitter
		super();

		if (typeof(configFile) !== 'string') {
			throw new TypeError('`configFile` must be a path string to a Spawnpoint config file.');
		}
		if (!configFile.endsWith('.json') && !configFile.endsWith('.js')) {
			configFile = configFile + '.json';
		}
		this.configFile = configFile;

		// set the folder for config to be autoloaded

		// Used to track if the application expects itself to continue running or not
		this.status = {
			setup: false, // has the app finished setup
			running: false, // is it in the running state. When false is attempting to shutdown
			stopping: false, // is it in a stopping state. when true is attempting to stop
			stopAttempts: 0, // how many attempts to stop have been triggered
		};

		// app CWD
		this.cwd = process.cwd();

		// detect if we are in a container
		this.containerized = helpers.isContainerized();

		// list of ENV configs that are blocklisted
		this.configBlocklist = require('../config-blocklist.json');

		// plugin registery
		this.register = [];

		// config object to store all application config
		this.config = {};

		// codes object to store all Spawnpoint codes
		this.codes = {};

		// errorMaps help wrap custom Error types to Spawnpoint codes.
		this.errorMaps = {};

		// error tracking, debounce detection
		this.limitMaps = {};

		// which plugins are loaded
		this.plugins = {};


		// make errorCode and failCode available
		this._errorCode = require('./errorCode.js');
		this._failCode = require('./failCode.js');
		this._roundRobin = require('./roundRobin.js')(this);
		this._getAndLock = require('./getAndLock.js')(this);

		// log formatting
		this.logs = {
			prefix: null,
			date: null,
		};

		return this;
	}

	/**
	 * Initializes framework to read the `configFile`, init config, Spawnpoint plugins, errorCodes and autoload
	 * folders. This also starts the application life-cycle so the app can stop gracefully.
	 * @callback {Function} [callback] Triggered once the `app.ready` event triggers.
	 * @return {this}
	 */
	setup(callback = () => {}) {
		// force .json parsing with comments :)
		this.setupJSONHandler();

		// prevent repeated setup
		if (this.status.setup) {
			return callback(this.errorCode('spawnpoint.already_setup'));
		}
		this.status.setup = true;

		// App loading process
		this.initConfig();
		this.initCodes();
		this.initRegistry();
		this.loadPlugins();
		this.loadConfig();
		this.loadCodes();
		this.initLimitListeners();
		this.loadErrorMap();
		const jobs = [];

		_.each(this.plugins, (plugin) => {
			if (plugin.callback) {
				return jobs.push(cb => plugin.exports(this, cb));
			}
			jobs.push((cb) => {
				plugin.exports(this);
				return cb();
			});
		});
		// load framework files
		_.each(this.config.autoload, (jobDetails) => {
			this.log('Autoloading %s', jobDetails.name || jobDetails.folder);
			const list = this.recursiveList(format('%s/%s', this.cwd, jobDetails.folder), jobDetails.extension || '.js');
			if (jobDetails.callback) {
				return jobs.push((callback) => {
					async.eachSeries(list, (file, acb) => {
						const modelCallback = (err) => {
							if (err) {
								this.error('Failed to load', file);
								return acb(err);
							}
							this.debug('Successfully loaded', file);
							return acb();
						};
						this.debug('Loading', file);
						let error;
						try {
							let required = require(file);
							// handle require esm modules
							if (required.__esModule) {
								required = required.default;
							}
							required(this, modelCallback);
						} catch (err) {
							error = err;
						}
						if (error) {
							return acb(error);
						}
					}, callback);
				});
			}
			jobs.push((callback) => {
				_.each(list, (file) => {
					this.debug('Loading', file);
					let error;
					try {
						let required = require(file);
						// handle require esm modules
						if (required.__esModule) {
							required = required.default;
						}
						required(this);
						this.debug('Successfully loaded', file);
					} catch (err) {
						error = err;
					}
					if (error) {
						return console.error(`Failed to load [${file}]`, error);
					}
				});
				return callback();
			});
		});
		process.nextTick(() => {
			async.series(jobs, (err) => {
				if (err) {
					this.error('Failed to start up').debug(err);
					this.emit('app.exit');
					return callback(err);
				}
				this.log('%s is ready.', this.config.name);
				this.emit('app.ready');
				return callback();
			});
		});
		this.emit('app.setup.done');
		return this;
	}

	/**
	 * Recursively list files in a directory by an optional file extension.
	 * NOTE: This is an event blocking sync method.
	 * @param  {String} dir  Directory to list files from.
	 * @param  {Array|string} [exts] Optional list of file extensions to return. Defaults to .js files. Set to a falsy value to disable this filter.
	 * @return {Array} Absolute/full path of filenames found.
	 */
	recursiveList(dir, exts = ['.js']) {
		assert(typeof(dir) === 'string', '`dir` must be a string');
		if (typeof(exts) === 'string') {
			exts = [exts];
		}
		const list = [];
		let stat;
		try {
			stat = fs.statSync(dir);
		} catch {
			stat = false;
		}
		if (!stat || !stat.isDirectory()) {
			return list;
		}
		// ensure proper trailing slash
		dir = String(dir + '/').replaceAll('/', '/');

		// Use withFileTypes to avoid a stat for every entry (significantly faster)
		const stack = [dir];
		while (stack.length > 0) {
			const current = stack.pop();
			let entries;
			try {
				entries = fs.readdirSync(current, { withFileTypes: true });
			} catch {
				continue;
			}
			for (const dirent of entries) {
				const full = current + dirent.name;
				if (dirent.isDirectory()) {
					if (exts && exts.includes('/')) {
						list.push(full);
					}
					stack.push(full + '/');
				} else if (!exts || exts.includes(path.extname(dirent.name))) {
					list.push(full);
				}
			}
		}
		list.sort(); // windows won't sort this like unix will
		return list;
	}

	/**
	 * Utility: Create random string.
	 * @param  {Number} [length] How long of a random string to create.
	 * @param  {String} [hashMethod] Which crypto hash method to use.
	 * @return {String} Random string of characters.
	 */
	random(length = 16) {
		length = Number.parseInt(length);
		assert(!Number.isNaN(length), '`length` must be a number');
		if (Number.isNaN(length) || length < 1) {
			length = 16; // TODO: throw an error in an update
		}
		return nanoid(length);
	}

	/**
	 * Utility: get random element from `collection`.
	 * This is a copy of the lodash _.sample method.
	 * @param  {Array|Object} items The collection to sample.
	 * @return {*} Returns the random element.
	 */
	sample(items) {
		return _.sample(items);
	}

	/**
	 * Utility: Creates new `roundRobin` class with collection.
	 * @param  {Array|Object} items The collection to sample.
	 * @return {roundRobin} Returns new instance of `roundRobin` class.
	 */
	roundRobin(items) {
		return new this._roundRobin(items);
	}

	/**
	 * Utility: get random element from `collection` in an async lock.
	 * @param  {Array|Object} items The collection to sample.
	 * @return {roundRobin} Returns new instance of `roundRobin` class.
	 */
	getAndLock(items) {
		return new this._getAndLock(items);
	}

	/**
	 * Utility: omit keys from an object. Similar to Lodash omit, but much faster.
	 * @param  {Object} items The source object.
	 * @param  {Array} keysToOmit Keys to omit from the object.
	 * @return {Object} Returns object with requested keys removed.
	 */
	omit(obj, keysToOmit = []) {
		return helpers.omit(obj, keysToOmit);
	}

	/**
	 * Checks if the current application runtime is running as a root user/group.
	 * @return {Boolean} When true: the application is running as a root user/group.
	 */
	isRoot() {
		if (this.isSecure() === true) {
			return false;
		}
		return true;
	}

	/**
	 * Checks if the current application runtime is running as a specific `uid` and/or `gid`.
	 * @param  {Number}  [uid] Unix `uid` to check against.
	 * @param  {Number}  [gid] Unix `gid` to check against. When not set will match `uid`.
	 * @return {Boolean} When true: the application is running as the user/group.
	 */
	isSecure(uid, gid) {
		// TODO: Fix testing on non UNIX (windows)?
		if (typeof(process.getuid) !== 'function' || typeof(process.getgid) !== 'function') {
			return true; // TODO: throw error
		}

		if (uid && !gid) {
			gid = uid;
		}
		const checks = {
			uid: process.getuid(),
			gid: process.getgid(),
			groups: String(child_process.execSync('groups')),
		};
		if (checks.uid === 0 || checks.gid === 0) {
			return this.errorCode('usercheck.is_root', { checks: checks });
		}
		if (checks.groups.includes('root')) {
			return this.errorCode('usercheck.is_root_group', { checks: checks });
		}
		if (uid && gid && (uid !== checks.uid || gid !== checks.gid)) {
			return this.errorCode('usercheck.incorrect_user', { checks: checks });
		}
		return true;
	}

	/**
	 * Helper method that requires a file and hoists the current spawnpoint application reference.
	 * @param  {String} filePath File path to require.
	 */
	require(filePath) {
		if (!filePath.startsWith(this.cwd)) {
			filePath = path.join(this.cwd, filePath);
		}
		return require(filePath)(this);
	}

	/**
	 * Builds a Spawnpoint code object. Codes are used to create a link between a human readable message
	 * and a computer readable string. Example: `file.not_found` -> "The requested file was not found."
	 * @param {String} code computer readable string code.
	 * @param {Object} [data] Object to extend the code Object with
	 * @return {Object} Code Object with a `message` with the computer readable message and the `code` matching the input code.
	 */
	code(code, data = {}) {
		assert(code && typeof(code) === 'string', '`code` must be an string.');
		assert(typeof(data) === 'object', '`data` must be an object.');
		if (!this.codes[code]) {
			throw new Error('No return code found with code: ' + code); // TODO: convert this to an errorCode
		}
		return _.defaults(data, {
			code: code,
			message: this.codes[code],
		});
	}

	/**
	 * Spawnpoint code that wraps a Javascript `Error` as a hard application error.
	 * @param {String} code computer readable string code.
	 * @param {Object} [data] Object to extend the code Object with
	 * @return {Object} Error Code Object with a `message` with the computer readable message and the `code` matching the input code.
	 */
	errorCode(code, data) {
		const getCode = this.code(code, data);
		this.emit('errorCode', getCode);
		return new this._errorCode(getCode);
	}

	/**
	 * Spawnpoint code that wraps a Javascript `Error`, as a soft error.
	 * @param {String} code computer readable string code.
	 * @param {Object} [data] Object to extend the code Object with
	 * @return {Object} Error Code Object with a `message` with the computer readable message and the `code` matching the input code.
	 */
	failCode(code, data) {
		const getCode = this.code(code, data);
		this.emit('failCode', getCode);
		return new this._failCode(getCode);
	}

	/**
	 * Error Monitoring, when enabled. This allows you to track how often an error occurs and issue a callback once that threadhold is met.
	 * @param  {String} code Spawnpoint code to match against
	 * @param  {Number} threshold Number of occurrences required to trigger callback.
	 * @param  {Object} options Extra limit options
	 * @param  {Object} [options.time] When set, number of milliseconds that the threshold cools down. On each tick this will reduce bv one until it reaches zero.
	 * @param  {Callback} callback Triggered when threshold is met.
	 * @return {this}
	 */
	registerLimit(code, threshold, options, callback) {
		if (!callback && options) {
			callback = options;
			options = {};
		}
		const opts = _.defaults(options, {
			callback: callback,
			threshold: threshold,
			error: 'errorCode', // or failCode
			index: null, // 'object.to.path' of unique index to track by
			reset: 1, // reset balance counter to this on a subsequent callback. Give it a negative number to disable this.
			time: null,
		});

		opts.uuid = _.uniqueId();

		if (!this.limitMaps[opts.error]) {
			this.limitMaps[opts.error] = {};
		}
		if (!this.limitMaps[opts.error][code]) {
			this.limitMaps[opts.error][code] = [];
		}
		this.limitMaps[opts.error][code].push(opts);
		return this;
	}

	/**
	 * Console.log wrapper that only triggers with when `config.debug` is enabled.
	 * @params {*} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	debug() {
		if (this.config.debug) {
			Reflect.apply(console.log, this, arguments);
		}
		return this;
	}

	/**
	 * Console.log wrapper that adds an INFO tag and timestamp to the log.
	 * @params {String|Object|Array|Number} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	info() {
		helpers.log({
			logs: this.logs,
			config: this.config.log,
			type: helpers.tag('INFO', kleur.green),
			line: kleur.white(Reflect.apply(format, this, arguments)),
		});
		return this;
	}

	/**
	 * Console.log wrapper that adds an LOG tag and timestamp to the log.
	 * @params {String|Object|Array|Number} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	log() {
		helpers.log({
			logs: this.logs,
			config: this.config.log,
			type: helpers.tag('LOG', kleur.cyan),
			line: kleur.white(Reflect.apply(format, this, arguments)),
		});
		return this;
	}

	/**
	 * Console.error` wrapper that adds an WARN tag and timestamp to the log. This prints to STDERR.
	 * @params {String|Object|Array|Number} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	warn() {
		helpers.log({
			logs: this.logs,
			config: this.config.log,
			type: helpers.tag('WARN', kleur.yellow),
			line: kleur.yellow(Reflect.apply(format, this, arguments)),
		}, 'error');
		return this;
	}

	/**
	 * Console.error` wrapper that adds an ERROR tag and timestamp to the log. This prints to STDERR.
	 * @params {String|Object|Array|Number} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	error() {
		helpers.log({
			logs: this.logs,
			config: this.config.log,
			type: helpers.tag('ERROR', kleur.red.bold),
			line: kleur.red(Reflect.apply(format, this, arguments)),
		}, 'error');
		return this;
	}

	/**
	 * Registers multiple custom Errors to a specific errorCode. This helps wrap errors into a singular errorCode system.
	 * @param {String} code The errorCode human readable Spawnpoint code.
	 * @param {Error} error Instance of the error to map to..
	 * @return {this}
	 */
	registerError(code, error) {
		this.errorMaps[code] = error;
		return this;
	}

	/**
	 * Registers multiple custom Errors to a specific errorCode, using the `registerError` method.
	 * @param  {Object} errors Errors being registered. Each index/key is the errorCode string that the custom Error represents. The Value must be an uninitialized instance of the error.
	 * @return {this}
	 */
	registerErrors(errors) {
		_.each(errors, (error, code) => {
			this.registerError(code, error);
		});
		return this;
	}

	/**
	 * Checks for Spawnpoint wrapped code, errorCode, or failCode when a potential error map is found (and previously registered). This method is useful as middleware to your application
	 * error handling so that you don't have to have the server reply with a generic error.
	 * @param  {Error} error Error to check for mapped error.
	 * @return {errorCode|false} Returns Spawnpoint mapped code, errorCode, or failCode or false when no mapped error was found.
	 */
	maskErrorToCode(error, type = 'code') {
		const validTypes = ['errorCode', 'failCode', 'code'];
		let returnedError = false;
		if (!validTypes.includes(type)) {
			throw new Error('Invalid `type` provided. Valid types:' + validTypes.join(',')); // TODO: convert to errorCode
		}
		_.each(this.errorMaps, (currentError, code) => {
			if (!returnedError && error instanceof currentError) {
				returnedError = this[type](code, error);
			}
		});
		return returnedError;
	}

	/**
	 * Internal: Initializes the Spawnpoint `config` object. Reads package.json and `configFile` file to build config.
	 * This is step 1 of 8 to startup Spawnpoint
	 * @param  {String} [configFile]  Sets the JSON file Spawnpoint uses to setup the framework.
	 * @return {this}
	 * @private
	 */
	initConfig(configFile = null) {
		const self = this;
		if (configFile) {
			this.configFile = configFile;
		}
		// reset config variable for reloading
		this.config = _.defaults(require(path.join(this.cwd, this.configFile)), {
			debug: false,
			plugins: [],
			autoload: [],
			secrets: '/run/secrets',
			codes: '/config/codes',
			configs: '/config',
			configOverride: null,
			signals: {
				close: ['SIGINT', 'SIGUSR2'],
				debug: ['SIGUSR1'],
			},
			catchExceptions: true,
			stopAttempts: 3,
			stopTimeout: 15000,
			trackErrors: false,
			log: {
				format: '{date} {type}: {line}',
				time: 'HH:mm:ss',
				date: 'dddd, MMMM DD YYYY',
			},
		});
		if (this.config.debug && !this.config.configOverride) {
			this.config.configOverride = 'dev-config.json';
		}
		if (this.config.resetConfigBlockListDefaults) {
			this.configBlocklist = {
				env: { list: [], patterns: [] },
				secrets: { list: [], patterns: [] },
				args: { list: [], patterns: [] },
			};
		}
		if (this.config.configBlocklist) {
			_.merge(this.configBlocklist, this.config.configBlocklist);
		}
		_.each(this.configBlocklist, (items) => {
			items.patterns = _.map(items.patterns, pattern => new RegExp(pattern));
		});
		let packageData = {};
		try {
			packageData = require(path.join(this.cwd, '/package.json'));
		} catch {
			// do nothing
		}
		// allow package.json version & name to set app.config vars
		if (packageData.version) {
			this.config.version = this.config.version || packageData.version;
		}
		if (packageData.name) {
			this.config.name = this.config.name || packageData.name || 'unnamed project';
		}

		// setup all of the required functions mounted on the `config` object

		/**
		 * Helper method to safely get a nested config item.
		 * @param  {String} path The path of the property to get.
		 * @param  {*} [defaultValue=false] The value returned for undefined resolved values.
		 * @return {*} Returns the resolved value.
		 */
		this.config.get = function(path, defaultValue) {
			return _.get(self.config, path, defaultValue);
		};

		/**
		 * Helper method to safely check if a nested config item exists
		 * @param  {String} path The path to check.
		 * @memberOf config
		 * @namespace config.has
		 * @return {*} Returns `true` if path exists, else `false`.
		 */
		this.config.has = function(path) {
			return _.has(self.config, path);
		};

		/**
		 * Helper method to get a random element from a Spawnpoint `config` item `collection`.
		 * @param  {path} path The path to return items from.
		 * @memberOf config
		 * @namespace config.getRandom
		 * @return {*} Returns random element from the collection.
		 */
		this.config.getRandom = function(path) {
			const items = self.config.get(path);
			if (!items) {
				throw self.errorCode('spawnpoint.config.sample_not_collection'); // TODO: choose better name
			}
			return _.sample(items);
		};

		const rrKeys = {};
		/**
		 * Helper method to get get random element from Spawnpoint `config` item `Array` with Round Robin ordering
		 * This ensures no single item is returned more than it's siblings.
		 * @param  {path} path The path to return items from.
		 * @memberOf config
		 * @namespace config.getRoundRobin
		 * @return {*} Returns random element from the collection.
		 */
		this.config.getRoundRobin = function(path) {
			if (!rrKeys[path]) {
				const items = self.config.get(path);
				rrKeys[path] = self.roundRobin(items);
			}
			return rrKeys[path].next();
		};

		const lockedKeys = {};
		/**
		 * Helper method to get get random element from Spawnpoint `config` item `Array` with async locking queue.
		 * This ensures no item is used at the same time as another async operation.
		 * @param  {path} path The path to return items from.
		 * @memberOf config
		 * @namespace config.getAndLock
		 * @return {*} Returns random element from the collection.
		 */
		this.config.getAndLock = function(path, timeout, callback) {
			if (!lockedKeys[path]) {
				const items = self.config.get(path);
				lockedKeys[path] = self.getAndLock(items);
			}
			return lockedKeys[path].next(timeout, callback);
		};

		this.emit('app.setup.initConfig');
		return this;
	}

	/**
	 * Internal: Registers Spawnpoint `config` by merging or setting values to the `config` object.
	 * @param  {String} name `config` top level key
	 * @param  {*} config value or object of the config
	 * @param  {String} [allowListCheck] Defines which allowlist to check against before merging. This is designed to prevent ENV or other config options that should be ignored.
	 * @return {Object} returns `this.config` new value
	 * @private
	 */
	registerConfig(name, config, allowListCheck = '') {
		let data = {};

		if (allowListCheck && this.configBlocklist[allowListCheck]) {
			if (this.configBlocklist[allowListCheck].list.includes(name)) { return this.debug('ignoring blocklist', name); }
			let found = false;
			_.each(this.configBlocklist[allowListCheck].patterns, (pattern) => {
				if (!found && pattern.test(name)) {
					found = true;
				}
			});
			if (found) { return this.debug('ignoring blocklist pattern', name); }
			if (this.config.debug) {
				this.log('Setting %s ENV variable [%s]', allowListCheck, name);
			}
		}
		if (name && !config) {
			data = name;
		} else {
			data[name] = config;
		}
		if (allowListCheck === 'env' || allowListCheck === 'secrets' || allowListCheck === 'config-hoist') {
			return _.set(this.config, name, config);
		}
		// eslint-disable-next-line unicorn/prefer-structured-clone
		return _.merge(this.config, _.cloneDeep(data));
	}

	/**
	 * Fast, low-overhead parser for ENV/secrets values.
	 * - true/false/null -> boolean/null
	 * - numbers (int/float) -> number
	 * - JSON-like (starts with { or [) -> JSON.parse (try once)
	 * Otherwise returns the original string.
	 * @private
	 */
	_parseEnvValue(value, allowJson = true) {
		if (typeof value !== 'string') { return value; }
		const lower = value.toLowerCase();
		if (lower === 'true') { return true; }
		if (lower === 'false') { return false; }
		if (lower === 'null') { return null; }
		if (/^-?\d+(\.\d+)?$/.test(value)) {
			const num = Number(value);
			if (!Number.isNaN(num)) { return num; }
		}
		if (
			allowJson &&
			value.length > 1 &&
			((value[0] === '{' && value.endsWith('}')) ||
				(value[0] === '[' && value.endsWith(']')))
		) {
			try {
				return JSON.parse(value);
			} catch {
				// keep original string on parse failure
			}
		}
		return value;
	}
	/**
	 * Internal: Builds app `config` object by looping through plugins, configs, ENV, Progress args, Docker secrets. , and finally
	 * config overrides (in that order). These items are hoisted to the Spawnpoint `config` object.
	 * This is step 5 of 8 to startup Spawnpoint
	 * @param  {String} [cwd] Path to load config files from.
	 * @param  {Boolean} ignoreExtra When true will skip plugins, ENV and Docker secrets. Allows for recursive usage.
	 * @return {this}
	 * @private
	 */
	loadConfig(cwd = '', ignoreExtra = false) {
		cwd = cwd || this.cwd;

		if (!ignoreExtra) {
			// load plugin defaults
			_.each(this.plugins, (plugin) => {
				if (plugin.config) {
					// ensure sideloaded plugins retain original config
					if (plugin.original_namespace) {
						plugin.config[plugin.namespace] = plugin.config[plugin.original_namespace];
						delete plugin.config[plugin.original_namespace];
					}
					this.registerConfig(plugin.config);
				}
				this.loadConfig(plugin.dir, true);
			});
		}

		// load local json files
		_.each(this.recursiveList(cwd + this.config.configs, '.json'), (file) => {
			// prevent loading base config and codes
			if (!file.includes(this.configFile) && !file.includes(this.config.codes)) {
				if (!this.config[path.parse(file).name]) {
					this.config[path.parse(file).name] = {};
				}
				this.registerConfig(path.parse(file).name, require(file));
			}
		});

		if (!ignoreExtra) {
			// handle process flags
			this.args = minimist(process.argv.slice(2));
			_.each(this.args, (value, key) => this.registerConfig(key, value, 'args'));
			this.argv = _.clone(this.args._) || [];

			// handle environment variables
			_.each(process.env, (value, key) => {
				key = key.replaceAll('__', '.'); // replace double underscores to dots, to allow object notation in environment vars
				value = this._parseEnvValue(value);
				return this.registerConfig(key, value, 'env');
			});

			if (this.config.secrets) {
				// handle docker secrets
				_.each(this.recursiveList(this.config.secrets, false), (file) => {
					let key;
					let value;
					try {
						key = path.basename(file);
						value = fs.readFileSync(file, 'utf8');
						value = this._parseEnvValue(value, true); // if it fails it will revert to above value
					} catch {
						// do nothing
					}
					if (!value || !key) { return; }
					return this.registerConfig(key, value, 'secrets');
				});
			}
		} else {
			this.debug('Ignoring config extra loading');
		}
		this.emit('app.setup.loadConfig');

		if (this.config.configOverride) {
			// allow dev-config.json in root directory to override config vars
			let access = null;
			try {
				access = require(path.join(this.cwd, this.config.configOverride));
			} catch {
				// do nothing
			}
			if (access) {
				this.debug('Overriding config with custom overrides');
				_.each(access, (value, key) => this.registerConfig(key, value, 'config-hoist'));
				// Emit an event to allow plugins to know that the config has been overridden
				this.emit('app.setup.configOverridden');
			}
		}
		return this;
	}

	/**
	 * Internal: Loads the internal Spawnpoint codes.
	 * This is step 2 of 8 to startup Spawnpoint
	 * @return {this}
	 * @private
	 */
	initCodes() {
		this.codes = {};
		_.each(this.recursiveList(path.join(__dirname, '../codes'), '.json'), (file) => {
			_.merge(this.codes, require(file));
		});
		this.emit('app.setup.initCodes');
		return this;
	}

	/**
	 * Internal: Loads the application codes from a folder
	 * This is step 6 of 8 to startup Spawnpoint
	 * @param {String} [cwd] Folder to load paths from.
	 * @param  {Boolean} ignoreExtra When true will skip plugins. Allows for recursive usage.
	 * @return {this}
	 * @private
	 */
	loadCodes(cwd = '', ignoreExtra = false) {
		cwd = cwd || path.join(this.cwd, this.config.codes);

		if (!ignoreExtra) {
			// load plugin defaults
			_.each(this.plugins, (plugin) => {
				if (plugin.codes) {
					this.registerCodes(plugin.codes);
				}
				this.loadCodes(plugin.dir + '/codes', true);
			});
		}

		// handle local files
		let list = null;
		try {
			list = this.recursiveList(cwd, ['.json']);
		} catch {
			this.debug('No codes folder found (%s), skipping', this.config.codes);
		}
		if (list) {
			_.each(list, (file) => {
				this.registerCodes(require(file));
			});
		}
		this.emit('app.setup.loadCodes');
		return this;
	}

	/**
	 * Internal: Hoists new codes into Spawnpoint `codes` object.
	 * @param  {Object} codes Codes to inject at key as the code computer readable and value at the human readable message.
	 * @return {this}
	 * @private
	 */
	registerCodes(codes) {
		_.merge(this.codes, structuredClone(codes));
		return this;
	}

	/**
	 * Internal: Starts the Spawnpoint application lifecycle registery. This ensures the application starts up correctly and shuts down gracefully.
	 * This is step 3 of 8 to startup Spawnpoint
	 * @return {this}
	 * @private
	 */
	initRegistry() {
		this.register = [];

		this.on('app.ready', () => {
			this.status.running = true;
			// only handle uncaught exceptions when ready
			if (!this.config.catchExceptions) { return; }
			process.on('uncaughtException', (err) => {
				this.error(err.message || err).debug(err.stack || '(no stack trace)');
				// close the app if we have not completed startup
				if (!this.status.running) {
					this.emit('app.stop', true);
				}
			});
		});

		// app registry is used to track graceful halting
		this.on('app.register', (item) => {
			if (!this.register.includes(item)) {
				this.log('Plugin registered: %s', item);
				this.register.push(item);
			}
		});
		this.on('app.deregister', (item) => {
			const i = this.register.indexOf(item);
			if (i !== -1) {
				this.register.splice(i, 1);
				this.warn('De-registered: %s', item);
			}
			if (!this.status.running && this.register.length === 0) {
				this.emit('app.exit', true);
			}
		});
		this.on('app.stop', () => {
			if (this.status.stopping) {
				this.status.stopAttempts++;
				if (this.status.stopAttempts === 1) {
					this.warn('%s will be closed in %sms if it does not shut down gracefully.', this.config.name, this.config.stopTimeout);
					setTimeout(() => {
						this.error('%s took too long to close. Killing process.', this.config.name);
						this.emit('app.exit');
					}, this.config.stopTimeout);
				}
				if (this.status.stopAttempts < this.config.stopAttempts) {
					return this.warn('%s already stopping. Attempt %s more times to kill process', this.config.name, this.config.stopAttempts - this.status.stopAttempts);
				}
				this.error('Forcefully killing %s', this.config.name);
				return this.emit('app.exit');
			}

			this.status.running = false;
			this.status.stopping = true;
			this.info('Stopping %s gracefully', this.config.name);
			this.emit('app.close');
			if (this.register.length === 0) {
				return this.emit('app.exit', true);
			}
		});
		this.on('app.exit', (graceful) => {
			if (!graceful) {
				/* eslint-disable n/no-process-exit */
				return process.exit(1);
			}
			this.info('%s gracefully closed.', this.config.name);
			process.exit();
		});

		if (this.config.signals) {
			// gracefully handle ctrl+c
			_.each(this.config.signals.close, (event) => {
				process.on(event, () => {
					this.emit('app.stop');
				});
			});

			// set debug mode on SIGUSR1
			_.each(this.config.signals.debug, (event) => {
				process.on(event, () => {
					this.config.debug = !this.config.debug;
				});
			});
		}

		this.emit('app.setup.initRegistry');
		return this;
	}

	/**
	 * Internal: Starts the Spawnpoint errorCode & failCode tracking. Disabled by default unless `config.trackErrors` is enabled due to a larger
	 * memory footprint required.
	 * This is step 7 of 8 to startup Spawnpoint
	 * @return {this}
	 * @private
	 */
	initLimitListeners() {
		const self = this;
		if (!this.config.trackErrors) { return this; }
		const issues = {
			errorCode: {},
			failCode: {},
		};
		_.each(['errorCode', 'failCode'], function(type) {
			function limitToErrors(error) {
				if (!self.limitMaps[type] || !self.limitMaps[type][error.code]) {
					return; // no issue being tracked
				}

				const limits = self.limitMaps[type][error.code];


				const defaultIssues = {
					occurrences: 0, // long count, track
					balance: 0, // time-based balance
					dateFirst: Math.floor(Date.now() / 1000),
					dateLast: null,
					datesTriggered: [],
					triggered: false, // track if we've triggered the current balance
				};

				if (!issues[type][error.code]) {
					issues[type][error.code] = {};
					issues[type][error.code].Global = _.pick(defaultIssues, ['occurrences', 'dateFirst', 'dateLast']);
				}

				issues[type][error.code].Global.occurrences++;
				issues[type][error.code].Global.dateLast = Math.floor(Date.now() / 1000);

				for (const limit of limits) {
					// new issue
					if (!issues[type][error.code][limit.uuid]) {
						issues[type][error.code][limit.uuid] = _.pick(defaultIssues, ['balance', 'triggered', 'datesTriggered']);
					}
					issues[type][error.code][limit.uuid].balance++;
					if (limit.time) {
						setTimeout(function() {
							issues[type][error.code][limit.uuid].balance--;
							if (issues[type][error.code][limit.uuid].balance <= 0) {
								issues[type][error.code][limit.uuid].balance = 0;
								issues[type][error.code][limit.uuid].triggered = false;
							}
						}, limit.time);
					}
					if (!issues[type][error.code][limit.uuid].triggered && issues[type][error.code][limit.uuid].balance >= limit.threshold) {
						issues[type][error.code][limit.uuid].triggered = true;
						limit.callback(_.merge(_.clone(issues[type][error.code][limit.uuid]), _.clone(issues[type][error.code].Global)));
						issues[type][error.code][limit.uuid].datesTriggered.push(issues[type][error.code].Global.dateLast); // add after callback, to avoid double dates
					} else if (issues[type][error.code][limit.uuid].triggered && limit.reset >= 0) {
						issues[type][error.code][limit.uuid].triggered = false;
						issues[type][error.code][limit.uuid].balance = limit.reset;
					}
				}
			}
			self.on(type, limitToErrors);
		});
		self.emit('app.setup.initLimitListeners');
		return this;
	}

	/**
	 * Internal: Loads all plugins defined on `config.plugins` array. These plugins must be installed via NPM.
	 * This is step 4 of 8 to startup Spawnpoint
	 * @return {this}
	 * @private
	 */
	loadPlugins() {
		this.config.plugins = _.map(this.config.plugins, (plugin) => {
			if (typeof(plugin) === 'string') {
				plugin = {
					plugin: plugin,
					name: null,
					namespace: null,
				};
			}
			const pluginFile = require(plugin.plugin);

			if (plugin.namespace) {
				// remove node modules cache to allow reuse of plugins under new namespaces
				delete require.cache[require.resolve(plugin.plugin)];
				pluginFile.original_namespace = pluginFile.namespace;
				plugin.original_namespace = pluginFile.namespace;
				pluginFile.namespace = plugin.namespace;
				pluginFile.name = plugin.name;
				this.info('Sideloading [%s] as plugin: [%s]', plugin.namespace, plugin.name);
			} else {
				plugin.namespace = pluginFile.namespace;
				plugin.name = pluginFile.name;
				this.info('Loading plugin: [%s]', plugin.name);
			}
			this.plugins[plugin.namespace] = pluginFile;
			return plugin;
		});
		this.emit('app.setup.loadPlugins');
		return this;
	}

	/**
	 * Internal: Sets up the error mapping to automatically match custom Error types to Spawnpoint codes.
	 * This is step 8 of 8 to startup Spawnpoint
	 * @return {this}
	 * @private
	 */
	loadErrorMap() {
		_.each(this.plugins, (plugin) => {
			if (plugin.errors) {
				this.registerErrors(plugin.errors);
			}
		});
		this.emit('app.setup.loadErrorMap');
		return this;
	}

	/**
	 * Internal: Called to register a Spawnpoint plugin. See Plugins docs for more details on how plugins work.
	 * @param  {Object} opts Plugin options `object`
	 * @param  {String} opts.name Plugin Name
	 * @param  {String} opts.namespace Application namespace used by the plugin
	 * @param  {String} opts.dir Folder where the plugin and it's config/codes can be found. (usually `__dir`)
	 * @param  {Object} opts.codes Custom codes to register to Spawnpoint
	 * @param  {Object} opts.config Custom config to register to Spawnpoint
	 * @param  {Function} opts.exports Plugin function to execute with (app, [callback]) context. Callback is only defined when `opts.callback` is true
	 * @param  {Boolean} [opts.callback] When true, will set the opts.exports to have a required callback function to be called once this plugin is in a `ready` state.
	 * @return {Object} Returns Spawnpoint plugin reference. Used internally to load plugins.
	 * @private
	 */
	static registerPlugin(opts) {
		assert(opts.name, 'Plugin is missing required `name` option.');
		assert(opts.namespace, 'Plugin is missing required `namespace` option.');
		assert(opts.exports, 'Plugin is missing required `exports` function.');
		return _.merge(opts, {
			codes: this.codes || null,
			config: this.config || null,
		});
	}

	/**
	 * Internal: Forces the JSON (require) handler to allow comments in JSON files. This allow documentation in JSON config files.
	 * @return {this}
	 * @private
	 */
	setupJSONHandler() {
		require(path.join(__dirname, '/json-handler.js'));
		return this;
	}
}

module.exports = spawnpoint;
