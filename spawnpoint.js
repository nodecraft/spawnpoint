'use strict';

// Include core libs
const fs = require('fs'),
	child_process = require('child_process'),
	crypto = require('crypto'),
	util = require('util'),
	path = require('path'),
	assert = require('assert'),
	events = require('events');

// Include external libraries
const _ = require('lodash'),
	async = require('async'),
	chalk = require('chalk'),
	minimist = require('minimist'),
	format = require("string-template"),
	moment = require('moment'),
	containerized = require('containerized');

// Define private helper functions
const helpers = {
	tag(tag, attrs){
		if(!tag){
			return '';
		}
		attrs = attrs || chalk.grey;
		return chalk.gray('[') + attrs(tag) + chalk.gray(']') + chalk.reset('');
	},
	camelCase(input){
		return input.split('.').map(function(word){
			return _.camelCase(word);
		}).join('.');
	},
	log(opts, type){
		var self = this;
		var currentTime = moment();
		var day = currentTime.format(self.config.log.date);
		if(!self.logs.date || self.logs.date !== day){
			self.logs.date = day;
			console.log(helpers.tag(day, chalk.green));
		}
		type = type || 'log';
		opts.date = opts.date || helpers.tag(currentTime.format(self.config.log.time), chalk.grey),
		console[type](format(self.config.log.format, opts));
	},
	errorCode(codeObject){
		Error.captureStackTrace(this, this.constructor);
		this.name = 'errorCode';
		this.message = codeObject.message;
		this.code = codeObject.code;
		this.data = _.omit(codeObject, ['code', 'message']);
	},
	failCode(codeObject){
		Error.captureStackTrace(this, this.constructor);
		this.name = 'failCode';
		this.message = codeObject.message;
		this.code = codeObject.code;
		this.data = _.omit(codeObject, ['code', 'message']);
	}
};
util.inherits(helpers.errorCode, Error);
util.inherits(helpers.failCode, Error);

/**
 * Agnostic JS framework that empowers devs to focus on quickly building apps, rather than focusing on application
 * config, health-checks, application structure, or architecture to build a 12 factor app in Docker.
 *
 * Spawnpoint can be configured to manage the entire application life-cycle or standalone as a utility library.
 * @class
 */
const spawnpoint = class {

	/**
	 * Creates new instance of spawnpoint
	 * @param  {string} [configFile] Sets the JSON file spawnpoint uses to setup the framework.
	 * @return {this}
	 */
	constructor(configFile = '/config/app.json'){
		// Used to track if the application expects itself to continue running or not
		this.cwd = process.cwd();
		this.status = {
			setup: false,
			running: false,
			stopping: false,
			stopAttempts: 0
		};
		this.containerized = containerized();
		this.configFile = configFile;
		this.configBlacklist = require('./config-blacklist.json');
		this.register = [];
		this.config = {};
		this.codes = {};
		this.errorMaps = {};
		this.limitMaps = {};
		this.plugins = {};
		this.logs = {
			prefix: null,
			date: null
		};

		events.EventEmitter.call(this);
		return this;
	}

	/**
	 * Initializes framework to read the `configFile`, init config, Spawnpoint plugins, errorCodes and autoload
	 * folders. This also starts the application life-cycle so the app can stop gracefully.
	 * @callback {Function} [callback] Triggered once the `app.ready` event triggers.
	 * @return {this}
	 */
	setup(callback = () => {}){
		var self = this;

		// force .json parsing with comments :)
		self.setupJSONHandler();

		// prevent repeated setup
		if(self.status.setup){
			return callback(self.code('app.already_setup'));
		}
		self.status.setup = true;

		// App loading process
		self.initConfig();
		self.initCodes();
		self.initRegistry();
		self.initLimitListeners();
		self.loadPlugins();
		self.loadConfig();
		self.loadCodes();
		self.loadErrorMap();
		var jobs = [];

		_.each(self.plugins, function(plugin){
			if(plugin.callback){
				return jobs.push(function(cb){
					return plugin.exports(self, cb);
				});
			}
			jobs.push(function(cb){
				plugin.exports(self);
				return cb();
			});
		});
		// load framework files
		_.each(self.config.autoload, function(jobDetails){
			self.log('Autoloading %s', jobDetails.name || jobDetails.folder);
			var list = self.recursiveList(util.format('%s/%s', self.cwd, jobDetails.folder), jobDetails.extension || '.js');
			if(jobDetails.callback){
				return jobs.push(function(callback){
					async.eachSeries(list, function(file, acb){
						var error;
						try{
							require(file)(self, acb);
						}catch(err){
							error = err;
						}
						if(error){
							return acb(error);
						}
					}, callback);
				});
			}
			jobs.push(function(callback){
				_.each(list, function(file){
					var error;
					try{
						require(file)(self);
					}catch(err){
						error = err;
					}
					if(error){
						return console.error(error);
					}
				});
				return callback();
			});
		});
		process.nextTick(function(){
			async.series(jobs, function(err){
				if(err){
					self.error("Failed to start up").debug(err);
					self.emit('app.exit');
					return callback(err);
				}
				self.log('%s is ready.', self.config.name);
				self.emit('app.ready');
				return callback();
			});
		});
		self.emit('app.setup.done');
		return this;
	}

	/**
	 * Recursively list files in a directory by an optional file extension.
	 * NOTE: This is an event blocking sync method.
	 * @param  {String} dir  Directory to list files from.
	 * @param  {Array|string} [exts] Optional list of file extensions to return. Defaults to .js files. Set to a falsy value to disable this filter.
	 * @return {Array} Absolute/full path of filenames found.
	 */
	recursiveList(dir, exts = ['.js']){
		if(typeof(exts) === 'string'){
			exts = [exts];
		}
		var parent = this, stat, list = [];
		try{
			stat = fs.statSync(dir);
		}catch(e){
			stat = false;
		}
		if(!stat || !stat.isDirectory()){
			return list;
		}
		dir = String(dir + '/').replace(/\//g, '/'); // ensure proper trailing slash
		_.each(fs.readdirSync(dir), function(file){
			var isDir = fs.statSync(dir + file).isDirectory();
			if(isDir && exts && exts.indexOf('/') !== -1){
				list.push(dir + file);
			}else if(isDir){
				var recursive = parent.recursiveList(dir + file, exts);
				if(recursive instanceof Array && recursive.length > 0){
					list = list.concat(recursive); // add results
				}
			}else{
				if(!exts || exts.indexOf(path.extname(file)) !== -1){
					list.push(dir + file);
				}
			}
		});
		list.sort(); // windows won't sort this like unix will
		return list;
	}

	/**
	 * Create random string.
	 * @param  {Number} [length] How long of a random string to create.
	 * @param  {String} [hashMethod] Which crypto hash method to use.
	 * @return {String} Random string of characters.
	 */
	random(length = 16, hashMethod = 'md5'){
		length = parseInt(length);
		if(isNaN(length) || length < 1){
			length = 16; // TODO: throw an error in an update
		}
		var random = String(new Date().getTime() + Math.random());
		return String(crypto.createHash(hashMethod).update(random).digest('hex')).slice(0, length);
	}

	/**
	 * Checks if the current application runtime is running as a root user/group.
	 * @return {Boolean} When true: the application is running as a root user/group.
	 */
	isRoot(){
		if(this.isSecure() === true){
			return false;
		}else{
			return true;
		}
	}

	/**
	 * Checks if the current application runtime is running as a specific `uid` and/or `gid`.
	 * @param  {Number}  [uid] Unix `uid` to check against.
	 * @param  {Number}  [gid] Unix `gid` to check against. When not set will match `uid`.
	 * @return {Boolean} When true: the application is running as the user/group.
	 */
	isSecure(uid, gid){
		var self = this;
		if(uid && !gid){
			gid = uid;
		}
		var checks = {
			uid: process.getuid(),
			gid: process.getgid(),
			groups: String(child_process.execSync('groups'))
		};
		if(checks.uid === 0 || checks.gid === 0){
			return self.errorCode('usercheck.is_root', {checks: checks });
		}
		if(checks.groups.indexOf('root') !== -1){
			return self.errorCode('usercheck.is_root_group', {checks: checks });
		}
		if(uid && gid && (uid !== checks.uid || gid !== checks.gid)){
			return self.errorCode('usercheck.incorrect_user', {checks: checks });
		}
		return true;
	}

	/**
	 * Helper method that requires a file and hoists the current spawnpoint application reference.
	 * @param  {String} path File path to require.
	 */
	require(path){
		var self = this;
		return require(path)(self);
	}

	/**
	 * Builds a Spawnpoint code object. Codes are used to create a link between a human readable message
	 * and a computer readable string. Example: `file.not_found` -> "The requested file was not found."
	 * @param {String} code computer readable string code.
	 * @param {Object} [data] Object to extend the code Object with
	 * @return {Object} Code Object with a `message` with the computer readable message and the `code` matching the input code.
	 */
	code(code, data = {}){
		if(!this.codes[code]){
			throw new Error("No return code found with code: " + code); // TODO: convert this to an errorCode
		}
		return _.defaults(data, {
			code: code,
			message: this.codes[code]
		});
	}

	/**
	 * Spawnpoint code that wraps a Javascript `Error` as a hard application error.
	 * @param {String} code computer readable string code.
	 * @param {Object} [data] Object to extend the code Object with
	 * @return {Object} Error Code Object with a `message` with the computer readable message and the `code` matching the input code.
	 */
	errorCode(code, data){
		var getCode = this.code(code, data);
		this.emit('errorCode', getCode);
		return new helpers.errorCode(getCode);
	}

	/**
	 * Spawnpoint code that wraps a Javascript `Error`, as a soft error.
	 * @param {String} code computer readable string code.
	 * @param {Object} [data] Object to extend the code Object with
	 * @return {Object} Error Code Object with a `message` with the computer readable message and the `code` matching the input code.
	 */
	failCode(code, data){
		var getCode = this.code(code, data);
		this.emit('failCode', getCode);
		return new helpers.failCode(getCode);
	}

	/**
	 * Console.log wrapper that only triggers with when `config.debug` is enabled.
	 * @params {String|Object|Array|Number} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	debug(){
		if(this.config.debug){
			console.log.apply(this, arguments);
		}
		return this;
	}

	/**
	 * Console.log wrapper that adds an INFO tag and timestamp to the log.
	 * @params {String|Object|Array|Number} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	info(){
		helpers.log({
			type: helpers.tag('INFO', chalk.green),
			line: chalk.white(util.format.apply(this, arguments))
		});
		return this;
	}

	/**
	 * Console.log wrapper that adds an LOG tag and timestamp to the log.
	 * @params {String|Object|Array|Number} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	log(){
		helpers.log({
			type: helpers.tag('LOG', chalk.cyan),
			line: chalk.white(util.format.apply(this, arguments))
		});
		return this;
	}

	/**
	 * Console.error` wrapper that adds an WARN tag and timestamp to the log. This prints to STDERR.
	 * @params {String|Object|Array|Number} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	warn(){
		helpers.log({
			type: helpers.tag('WARN', chalk.yellow),
			line: chalk.yellow(util.format.apply(this, arguments))
		});
		return this;
	}

	/**
	 * Console.error` wrapper that adds an ERROR tag and timestamp to the log. This prints to STDERR.
	 * @params {String|Object|Array|Number} [args..] Arguments to be passed to logging.
	 * @return {this}
	 */
	error(){
		helpers.log({
			type: helpers.tag('ERROR', chalk.red.bold),
			line: chalk.red(util.format.apply(this, arguments))
		}, 'error');
		return this;
	}

	registerErrors(errors){
		var self = this;
		_.each(errors, function(error, code){
			self.registerError(code, error);
		});
		return this;
	}

	registerError(code, error){
		this.errorMaps[code] = error;
		return this;
	}

	maskErrorToCode(err){
		var self = this,
			returnedError = false;
		_.each(self.errorMaps, function(error, code){
			if(!returnedError && err instanceof error){
				returnedError = self.code(code, err);
			}
		});
		return returnedError;
	}

	initConfig(configFile = null){
		var self = this;
		if(configFile){
			this.configFile = configFile;
		}
		// reset config variable for reloading
		this.config = _.defaults(require(this.cwd + this.configFile), {
			debug: false,
			plugins: [],
			autoload: [],
			secrets: '/run/secrets',
			codes: '/config/codes',
			configOverride: null,
			stopAttempts: 3,
			stopTimeout: 15000,
			log: {
				format: '{date} {type}: {line}',
				time: "HH:mm:ss",
				date: "dddd, MMMM Do YYYY"
			}
		});
		if(this.config.debug){
			if(!this.config.configOverride){
				this.config.configOverride = 'dev-config.json';
			}
		}
		if(this.config.resetConfigBlackListDefaults){
			this.configBlacklist = {
				env: {list: [], patterns: []},
				secrets: {list: [], patterns: []},
				args: {list: [], patterns: []}
			};
		}
		if(this.config.configBlacklist){
			_.merge(this.configBlacklist, this.config.configBlacklist);
		}
		_.each(this.configBlacklist, function(items){
			items.patterns = _.map(items.patterns, function(pattern){
				return new RegExp(pattern);
			});
		});
		var packageData = {};
		try{
			packageData = require(path.join(this.cwd, '/package.json'));
		}catch(e){
			// do nothing
		}
		// allow package.json version & name to set app.config vars
		if(packageData.version){
			this.config.version = this.config.version || packageData.version;
		}
		if(packageData.name){
			this.config.name = this.config.name || packageData.name || "unnamed project";
		}
		this.config.get = function(key){
			return _.get(self.config, key);
		};
		this.config.has = function(key){
			return _.has(self.config, key);
		};
		this.config.getRandom = function(key){
			let items = self.config.get(key);
			if(!items || !items.length){
				throw new self._errorCode('app.config.sample_not_array');
			}
			return _.sample(items);
		};

		let rrKeys = {};
		this.config.getRoundRobbin = function(key){
			let items = self.config.get(key);
			if(!items || !items.length){
				throw new self._errorCode('app.config.sample_not_array');
			}
			let keys = _.keys(items);
			// ensure our pool exists
			// check if we've filled our RR pool, empty
			if(!rrKeys[key] || _.size(keys) === _.size(rrKeys[key])){
				rrKeys[key] = [];
			}
			let useKey = _.sample(_.xor(keys, rrKeys[key]));
			rrKeys[key].push(useKey);
			return items[useKey];
		};

		let lockedKeys = {};
		this.config.getAndLock = function(key, timeout, callback){
			if(timeout && !callback){
				callback = timeout;
				timeout = undefined;
			}
			callback = callback || function(){};
			let hasCB = false;

			const items = self.config.get(key);
			if(!items || !items.length){
				return callback(self.failCode('app.config.sample_not_array'), null, function(){});
			}

			// set timeout
			if(timeout !== undefined){
				setTimeout(function(){
					hasCB = true;
					return callback(self.failCode('app.config.locked_timeout'), null, function(){});
				}, timeout);
			}

			// ensure queue exists
			if(!lockedKeys[key]){
				const handleQueue = function(queueItem, cb){
					// ensure timeouts don't lock up the queue
					if(queueItem.hasCB){
						return cb();
					}
					const keys = _.keys(items);
					let useKey = _.sample(_.xor(keys, lockedKeys[key].locked));
					lockedKeys[key].locked.push(useKey);
					return queueItem.callback(null, items[useKey], function(){
						let index = lockedKeys[key].locked.indexOf(useKey);
						lockedKeys[key].locked.splice(index, 1);
						return cb();
					});
				};
				lockedKeys[key] = {
					locked: [],
					queue: async.queue(handleQueue, items.length)
				};
			}
			// add to queue
			return lockedKeys[key].queue.push({
				callback: callback,
				hasCB: hasCB
			});
		};

		this.emit('app.setup.initConfig');
		return this;
	}

	registerConfig(name, config, whiteListCheck){
		var self = this,
			data = {};

		if(whiteListCheck && self.configBlacklist[whiteListCheck]){
			if(self.configBlacklist[whiteListCheck].list.includes(name)){ return self.debug('ignoring blacklist', name); }
			var found = false;
			_.each(self.configBlacklist[whiteListCheck].patterns, function(pattern){
				if(!found && pattern.test(name)){
					found = true;
				}
			});
			if(found){ return self.debug('ignoring blacklist pattern', name); }
			self.log('Setting %s ENV variable [%s]', whiteListCheck, name);
		}
		if(name && !config){
			data = name;
		}else{
			data[name] = config;
		}
		switch(whiteListCheck){
			case "env":
			case "secrets":
			case "config-hoist":
				return _.set(self.config, name, config);
			default:
				return _.merge(self.config, _.cloneDeep(data));
		}
	}

	loadConfig(cwd, ignoreExtra){
		var self = this;
		cwd = cwd || self.cwd;
		ignoreExtra = ignoreExtra || false;

		// load plugin defaults
		_.each(self.plugins, function(plugin){
			if(plugin.config){
				// ensure sideloaded plugins retain original config
				if(plugin.original_namespace){
					plugin.config[plugin.namespace] = plugin.config[plugin.original_namespace];
					delete plugin.config[plugin.original_namespace];
				}
				self.registerConfig(plugin.config);
			}
		});

		// load local json files
		_.each(self.recursiveList(cwd + '/config', '.json'), function(file){
			// prevent loading base config and codes
			if(file.indexOf(self.configFile) === -1 && file.indexOf(self.config.codes) === -1){
				if(!self.config[path.parse(file).name]){
					self.config[path.parse(file).name] = {};
				}
				self.registerConfig(path.parse(file).name, require(file));
			}
		});

		if(!ignoreExtra){
			// handle process flags
			self.args = minimist(process.argv.slice(2));
			_.each(self.args, function(value, key){
				return self.registerConfig(key, value, 'args');
			});
			self.argv = _.clone(self.args._) || [];

			// handle environment variables
			_.each(process.env, function(value, key){
				key = key.replace(/__/g, '.'); // replace double underscores to dots, to allow object notation in environment vars
				try{
					value = JSON.parse(value);
				}catch(e){
					// do nothing
				}
				return self.registerConfig(key, value, 'env');
			});

			if(self.config.secrets){
				// handle docker secrets
				_.each(self.recursiveList(self.config.secrets, false), function(file){
					var key, value;
					try{
						key = path.basename(file);
						value = fs.readFileSync(file, 'utf8');
						value = JSON.parse(value); // if it fails it will revert to above value
					}catch(e){
						// do nothing
					}
					if(!value || !key){ return; }
					return self.registerConfig(key, value, 'secrets');
				});
			}
		}else{
			self.debug("Ignoring config extra loading");
		}
		self.emit('app.setup.loadConfig');

		if(self.config.configOverride){
			// allow dev-config.json in root directory to override config vars
			var access = null;
			try{
				access = require(path.join(self.cwd, self.config.configOverride));
			}catch(err){
				// do nothing
			}
			if(access){
				self.debug('Overriding config with custom overrides');
				_.each(access, function(value, key){
					return self.registerConfig(key, value, 'config-hoist');
				});
			}
		}
		return this;
	}

	initCodes(){
		var self = this;
		self.codes = {};
		_.each(self.recursiveList(__dirname + '/codes', '.json'), function(file){
			_.merge(self.codes, require(file));
		});
		self.emit('app.setup.initCodes');
		return this;
	}

	loadCodes(cwd){
		var self = this;
		cwd = cwd || self.cwd + self.config.codes;

		// load plugin defaults
		_.each(self.plugins, function(plugin){
			if(plugin.codes){
				self.registerCodes(plugin.codes);
			}
		});

		// handle local files
		var list = null;
		try{
			list = self.recursiveList(cwd, ['.json']);
		}catch(err){
			self.debug('No codes folder found (%s), skipping', self.config.codes);
		}
		if(list){
			_.each(list, function(file){
				self.registerCodes(require(file));
			});
		}
		self.emit('app.setup.loadCodes');
		return this;
	}

	registerCodes(codes){
		var self = this;
		_.merge(self.codes, _.cloneDeep(codes));
	}

	initRegistry(){
		var self = this;
		self.register = [];

		self.on('app.ready', function(){
			self.status.running = true;
			// only handle uncaught exceptions when ready
			process.on('uncaughtException', function(err){
				self.error(err.message || err).debug(err.stack || '(no stack trace)');
				// close the app if we have not completed startup
				if(!self.status.running){
					self.emit('app.stop', true);
				}
			});
		});

		// app registry is used to track graceful halting
		self.on('app.register', function(item){
			if(self.register.indexOf(item) === -1){
				self.log('Plugin registered: %s', item);
				self.register.push(item);
			}
		});
		self.on('app.deregister', function(item){
			var i = self.register.indexOf(item);
			if(i !== -1){
				self.register.splice(i, 1);
				self.warn('De-registered: %s', item);
			}
			if(!self.status.running && self.register.length < 1){
				self.emit('app.exit', true);
			}
		});
		self.on('app.stop', function(){
			if(self.status.stopping){
				self.status.stopAttempts++;
				if(self.status.stopAttempts === 1){
					self.warn('%s will be closed in %sms if it does not shut down gracefully.', self.config.name, self.config.stopTimeout);
					setTimeout(function(){
						self.error('%s took too long to close. Killing process.', self.config.name);
						self.emit('app.exit');
					}, self.config.stopTimeout);
				}
				if(self.status.stopAttempts < self.config.stopAttempts){
					return self.warn('%s already stopping. Attempt %s more times to kill process', self.config.name, self.config.stopAttempts - self.status.stopAttempts);
				}else{
					self.error('Forcefully killing %s', self.config.name);
					return self.emit('app.exit');
				}
			}

			self.status.running = false;
			self.status.stopping = true;
			self.info('Stopping %s gracefully', self.config.name);
			self.emit('app.close');
			if(!self.register.length){
				return self.emit('app.exit', true);
			}
		});
		self.on('app.exit', function(graceful){
			/* eslint-disable no-process-exit */
			if(!graceful){
				return process.exit(1);
			}
			self.info('%s gracefully closed.', self.config.name);
			process.exit();
		});

		// gracefully handle ctrl+c
		_.each(['SIGINT', 'SIGUSR2'], function(event){
			process.on(event, function(){
				self.emit('app.stop');
			});
		});

		// set debug mode on SIGUSR1
		process.on('SIGUSR1', function(){
			self.config.debug = !self.config.debug;
		});

		self.emit('app.setup.initRegistry');
		return this;
	}

	initLimitListeners(){
		var self = this;
		var issues = {
			errorCode: {},
			failCode: {}
		};
		_.each(['errorCode', 'failCode'], function(type){
			function limitToErrors(error){
				if(!self.limitMaps[type] || !self.limitMaps[type][error.code]){
					return; // no issue being tracked
				}

				var limit = self.limitMaps[type][error.code];

				// new issue
				if(!issues[type][error.code]){
					issues[type][error.code] = {
						occurrences: 0, // long count, track
						balance: 0, // time-based balance
						dateFirst: moment().unix(),
						dateLast: null,
						datesTriggered: [],
						triggered: false // track if we've triggered the current balance
					};
				}
				issues[type][error.code].occurrences++;
				issues[type][error.code].balance++;
				issues[type][error.code].dateLast = moment().unix();

				if(limit.time){
					setTimeout(function(){
						issues[type][error.code].balance--;
						if(issues[type][error.code].balance <= 0){
							issues[type][error.code].balance = 0;
							issues[type][error.code].triggered = false;
						}
					}, limit.time);
				}
				if(!issues[type][error.code].triggered && issues[type][error.code].balance > limit.threshold){
					issues[type][error.code].triggered = true;
					limit.callback(_.clone(issues[type][error.code]));
					issues[type][error.code].datesTriggered.push(issues[type][error.code].dateLast); // add after callback, to avoid double dates
				}
			}
			self.on(type, limitToErrors);
		});
		self.emit('app.setup.initLimitListeners');
		return this;
	}

	loadPlugins(){
		var self = this;
		self.config.plugins = _.map(self.config.plugins, function(plugin){
			if(typeof(plugin) === 'string'){
				plugin = {
					plugin: plugin,
					name: null,
					namespace: null
				};
			}
			var pluginFile = require(plugin.plugin);
			// remove node modules cache to allow reuse of plugins under new namespaces
			delete require.cache[require.resolve(plugin.plugin)];

			if(plugin.namespace){
				pluginFile.original_namespace = pluginFile.namespace;
				plugin.original_namespace = pluginFile.namespace;
				pluginFile.namespace = plugin.namespace;
				pluginFile.name = plugin.name;
				self.info('Sideloading [%s] as plugin: [%s]', plugin.namespace, plugin.name);
			}else{
				plugin.namespace = pluginFile.namespace;
				plugin.name = pluginFile.name;
				self.info('Loading plugin: [%s]', plugin.name);
			}
			self.plugins[plugin.namespace] = pluginFile;
			return plugin;
		});
		self.emit('app.setup.loadPlugins');
		return this;
	}

	loadErrorMap(){
		var self = this;
		_.each(self.plugins, function(plugin){
			if(plugin.errors){
				self.registerErrors(plugin.errors);
			}
		});
		self.emit('app.setup.loadErrorMap');
		return this;
	}

	registerPlugin(opts){
		var self = this;
		if(self.status.setup){
			throw new self._errorCode('app.register_plugin_on_runtime');
		}
		assert(opts.name, 'Plugin is missing required `name` option.');
		assert(opts.namespace, 'Plugin is missing required `namespace` option.');
		assert(opts.exports, 'Plugin is missing required `exports` function.');
		//self.logs.prefix = opts.namespace;
		self.loadConfig(opts.dir, true);
		self.loadCodes(opts.dir + '/codes');

		return _.merge(opts, {
			codes: self.codes || null,
			config: self.config || null
		});
	}

	setupJSONHandler(){
		require(__dirname + '/require-extensions.js');
		return this;
	}

	registerLimit(code, threshold, options, callback){
		if(!callback && options){
			callback = options;
			options = {};
		}
		var opts = _.defaults(options, {
			callback: callback,
			threshold: threshold,
			error: 'errorCode', // or failCode
			index: null, // 'object.to.path' of unique index to track by
			reset: true, // reset balance counter on callback
			time: null
		});

		if(!this.limitMaps[opts.error]){
			this.limitMaps[opts.error] = {};
		}
		if(!this.limitMaps[opts.error][code]){
			this.limitMaps[opts.error][code] = [];
		}
		this.limitMaps[opts.error][code].push(opts);
	}
};
util.inherits(spawnpoint, events.EventEmitter);

module.exports = spawnpoint;