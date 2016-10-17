'use strict';

// Include core libs
var fs = require('fs'),
	crypto = require('crypto'),
	util = require('util'),
	path = require('path'),
	assert = require('assert'),
	events = require('events');

// Include external libraries
var _ = require('lodash'),
	async = require('async'),
	chalk = require('chalk'),
	minimist = require('minimist'),
	format = require("string-template"),
	moment = require('moment');

// Define private helper functions
var helpers = {
	tag: function(tag, attrs){
		if(!tag){
			return '';
		}
		attrs = attrs || chalk.grey;
		return chalk.gray('[') + attrs(tag) + chalk.gray(']') + chalk.reset('');
	},
	camelCase: function(input){
		return input.split('.').map(function(word){
			return _.camelCase(word);
		}).join('.');
	}
};


// Actual framework
var appframe = function(){
	// Helper function to force itself to be a prototype
	if(!(this instanceof appframe)){
		return new appframe();
	}

	// Used to track if the application expects itself to continue running or not
	this.cwd = process.cwd();
	this.status = {
		setup: false,
		running: false,
		stopping: false,
		stopAttempts: 0
	};
	this.register = [];
	this.config = {};
	this.codes = {};
	this.errorMaps = {};
	this.plugins = {};
	this.logs = {
		prefix: null,
		date: null
	}

	this._errorCode = function(codeObject){
		Error.captureStackTrace(this, this.constructor);
		this.name = 'errorCode';
		this.message = codeObject.message;
		this.code = codeObject.code;
		this.data = _.omit(codeObject, ['code', 'message']);
	};
	util.inherits(this._errorCode, Error);

	this._failCode = function(codeObject){
		Error.captureStackTrace(this, this.constructor);
		this.name = 'failCode';
		this.message = codeObject.message;
		this.code = codeObject.code;
		this.data = _.omit(codeObject, ['code', 'message']);
	};
	util.inherits(this._failCode, Error);

	events.EventEmitter.call(this);
}
util.inherits(appframe, events.EventEmitter);

/*
	function initConfig()

	Private method used to initialize config loading. Loads default
	config for the app instance.
*/
appframe.prototype.initConfig = function(){
	var self = this;

	// reset config variable for reloading
	self.config = _.defaults(require(self.cwd + '/config/app.json'), {
		name: "unnamed project",
		debug: false,
		plugins: [],
		autoload: [],
		codes: '/config/codes',
		stopAttempts: 3,
		stopTimeout: 15000,
		log: {
			format: '{date} {type}: {line}',
			time: "HH:mm:ss",
			date: "dddd, MMMM Do YYYY"
		}
	});
	self.config.get = function(key){
		return _.get(self.config, key);
	};
	self.config.has = function(key){
		return _.has(self.config, key);
	};
	return this;
}

/*
	function loadConfig(cwd)
	*** cwd - string

	Private method used to load configs. cwd sets the dir to start
	Loaded in this order:

		- plugins
		- config JSON files
		- process flags
		- environment variables
*/
appframe.prototype.loadConfig = function(cwd, ignoreExtra){
	var self = this;
	cwd = cwd || self.cwd;
	ignoreExtra = ignoreExtra || false;

	// load plugin defaults
	_.each(self.plugins, function(plugin){
		if(plugin.config){
			_.merge(self.config, plugin.config);
		}
	});

	// load local json files
	_.each(self.recursiveList(cwd + '/config', '.json'), function(file){
		// prevent loading base config and codes
		if(file.indexOf('/config/app.json') === -1 && file.indexOf(self.config.codes) === -1){
			if(!self.config[path.parse(file).name]){
				self.config[path.parse(file).name] = {};
			}
			_.merge(self.config[path.parse(file).name], require(file));
		}
	});

	if(!ignoreExtra){
		// handle process flags
		_.each(minimist(process.argv.slice(2)), function(value, key){
			return _.merge(self.config[key], value);
		});

		// handle environment variables
		_.each(process.env, function(value, key){
			return _.set(self.config, helpers.camelCase(key), value);
		});
	}
	return this;
}

/*
	function initCodes()

	Private method to initialize error codes. Loads default
	appframe system codes.
*/
appframe.prototype.initCodes = function(){
	var self = this;
	self.codes = {};
	_.each(self.recursiveList(__dirname + '/codes', '.json'), function(file){
		_.merge(self.codes, require(file));
	});
	return this;
}

/*
	function loadCodes(cwd)
	*** cwd - string

	Private method used to load error codes. cwd sets the
	dir to start. Loaded in this order:

		- plugins
		- error codes JSON files
*/
appframe.prototype.loadCodes = function(cwd){
	var self = this;
	cwd = cwd || self.cwd + self.config.codes;

	// load plugin defaults
	_.each(self.plugins, function(plugin){
		if(plugin.codes){
			self.registerCodes(plugin.codes)
		}
	});

	// handle local files
	var list = null;
	try{
		list = self.recursiveList(cwd, ['.json'])
	}catch(err){
		self.debug('No codes folder found (%s), skipping', self.config.codes);
	}
	if(list){
		list.forEach(function(file){
			self.registerCodes(require(file))
		});
	}
	return this;
}

/*
	function registerCodes(cwd)
	*** codes - object

	Private method used to load object of error codes.
	into the app error codes.

*/
appframe.prototype.registerCodes = function(codes){
	var self = this;
	_.merge(self.codes, _.cloneDeep(codes));
}

/*
	function initRegistry()

	Private method to handle application events:

	app.ready - emitted when framework is online and running
	app.stop - emitted to halt the framework gracefully
	app.close - emitted to close models and plugins
	app.exit - emitted to halt the process
	app.register - emitted by models and plugins to register
	app.deregister - emitted by models and plugins to deregister
*/
appframe.prototype.initRegistry = function(){
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
	})

	// app registry is used to track graceful halting
	self.on('app.register', function(item){
		if(self.register.indexOf(item) === -1){
			self.log('Plugin registered: %s', item);
			self.register.push(item);
		}
	});
	self.on('app.deregister', function(item){
		var i = self.register.indexOf(item)
		if(i !== -1){
			self.register.splice(i, 1);
			self.warn('De-registered: %s', item);
		}
		if(!self.status.running && self.register.length < 1){
			self.emit('app.exit', true);
		}
	});
	self.on('app.stop', function(timeout){
		timeout = timeout || self.config.stopTimeout;
		if(self.status.stopping){
			self.status.stopAttempts++;
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
		if(self.register.length == 0){
			return self.emit('app.exit', true);
		}
		setTimeout(function(){
			self.error('%s took too long to close. Killing process.', self.config.name);
			self.emit('app.exit');
		}, timeout);
	});
	self.on('app.exit', function(graceful){
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
	return this;
}

/*
	function loadPlugins()

	Private method used to initialize plugin loading
*/
appframe.prototype.loadPlugins = function(){
	var self = this;
	self.config.plugins.forEach(function(plugin){
		var pluginFile = require(plugin);
		self.info('Loading plugin: %s', pluginFile.name);
		self.plugins[pluginFile.namespace] = pluginFile;
	});
	return this;
}

/*
	function loadErrorMap()

	Private method used to initialize error maps:
	Loaded in this order:
	- plugins
*/
appframe.prototype.loadErrorMap = function(){
	var self = this;
	_.each(self.plugins, function(plugin){
		if(plugin.errors){
			self.registerErrors(plugin.errors);
		}
	});
	return this;
}

/*
	function registerPlugin(config [, callback])
	*** setup - object
	*** callback - function

	The setup function is designed to create a "proper"
	configuration for the application framework. This
	enables:
		- autoloading files
		- error codes
		- uncaughtexception handlers
		- proper signal handling (linux)
		- graceful application stop

	This method is NOT required, but is recommended for
	any application not simply requiring a micro-framework.
*/
appframe.prototype.registerPlugin = function(opts){
	var self = this;
	if(self.status.setup){
		throw new self._errorCode('app.register_plugin_on_runtime');
	}
	assert(opts.name, 'Plugin is missing required `name` option.');
	assert(opts.namespace, 'Plugin is missing required `namespace` option.');
	assert(opts.name, 'Plugin is missing required `exports` function.');
	//self.logs.prefix = opts.namespace;
	self.loadConfig(opts.dir, true);
	self.loadCodes(opts.dir + '/codes');

	return _.merge(opts, {
		codes: self.codes || null,
		config: self.config || null
	});
}

/*
	function setup(config [, callback])
	*** setup - object
	*** callback - function

	The setup function is designed to create a "proper"
	configuration for the application framework. This
	enables:
		- autoloading files
		- error codes
		- uncaughtexception handlers
		- proper signal handling (linux)
		- graceful application stop

	This method is NOT required, but is recommended for
	any application not simply requiring a micro-framework.
*/

appframe.prototype.setup = function(callback){
	var self = this,
		callback = callback || function(){};

	// force .json parsing with comments :)
	require('./require-extensions.js');

	// prevent repeated setup
	if(self.status.setup){
		return callback(self.code('app.already_setup'));
	}
	self.status.setup = true;

	// App loading process
	self.initConfig();
	self.initCodes();
	self.initRegistry();
	self.loadPlugins();
	self.loadConfig();
	self.loadCodes();
	self.loadErrorMap()
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

	async.series(jobs, function(err){
		if(err){
			self.error("Failed to start up").debug(err);
			return self.emit('app.exit');
		}
		self.emit('app.ready');
		self.log('%s is ready.', self.config.name);
	});
	return this;
};

/*
	function recursiveList(dir [, ext])
	*** dir - string
	*** ext - string

	Utility method to recursively list all files of
	the dir folder provided. This has the option to
	filter by file extension.

	Returns array of absolute file names.
*/
appframe.prototype.recursiveList = function(dir, exts){
	exts = exts || ['.js'];
	if(!(exts instanceof Array)){
		exts = [exts];
	}
	var parent = this,
		stat = fs.statSync(dir),
		list = [];
	if(!stat.isDirectory()){
		return false;
	}
	dir = String(dir + '/').replace(/\//g, '/'); // ensure proper trailing slash
	_.each(fs.readdirSync(dir), function(file){
		var isDir = fs.statSync(dir + file).isDirectory();
		if(isDir && exts.indexOf('/') !== -1){
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
	return list;
};

/*
	function random([length])
	*** length - int

	Utility method to generate random strings. This
	method could probably use a faster or more secure
	method for doing so. Providing a length will force
	the size of the string to the size provided.

	Returns string of random characters.
*/
appframe.prototype.random = function(length){
	length = parseInt(length) || 16;
	if(isNaN(length) || length < 1){
		length = 16
	}
	var random = String(new Date().getTime() + Math.random());
	return String(crypto.createHash('md5').update(random).digest('hex')).slice(0, length);
};

/*
	function isRoot()

	Quick test to determine if this application is running as root user.

	IMPORTANT: CANNOT DETECT SUPERUSE ACCOUNTS OR SUDO

	TODO: add extra detection to get better results of elevated users
*/
appframe.prototype.isRoot = function(){
	return (process.getuid() === 0 || process.getgid() === 0);
};

/*
	function code(code)
	*** code - string

	Error code system to provide better error handling
	to end users. A string error such as "bad_request"
	will be turned into a verbose error and the string
	code for handling by programs and humans alike.

	All codes must be initialized with setup() method.

	Returns object of code and message.
*/
appframe.prototype.code = function(code, data){
	if(!this.codes[code]){
		throw new Error("No return code found with code: "+ code);
	}
	return _.defaults(data || {}, {
		code: code,
		message: this.codes[code]
	});
};

/*
	These two functions are defined to seperate "errors"
	from soft fails. Useful for API response codes.

	function errorCode(code[ , data])
	*** code - string
	*** data - object

	Similar to the code method above, this returns the
	code, but as an error object. This is useful when
	masking errors or creating new Errors for callbacks

	Returns merged object of code and Error.
*/
appframe.prototype.errorCode = function(code, data){
	var getCode = this.code(code, data);
	return new this._errorCode(getCode);
};
appframe.prototype.failCode = function(code, data){
	var getCode = this.code(code, data);
	return new this._failCode(getCode);
};

/*
	These registries help cast errors by type of an
	error code. Useful for API response code automation

	function errorCode(errors)
	*** errors - object

	Key and value object to registered errors which are
	populated with the below method pramatically.
*/
appframe.prototype.registerErrors = function(errors){
	var self = this;
	_.each(errors, function(error, code){
		self.registerError(code, error);
	});
	return this;
};

/*
	function registerError(code, error)
	*** code - string
	*** error - Error Instance

	Code relates to a error code and error is an instance
	of an error to match by instance.
*/
appframe.prototype.registerError = function(code, error){
	this.errorMaps[code] = error;
	return this;
};

/*
	function maskErrorToCode(err)
	*** err - Error Instance

	Looks up code to match against error passed. Useful for
	API response codes.
*/
appframe.prototype.maskErrorToCode = function(err){
	var self = this,
		returnedError = false;
	_.each(self.errorMaps, function(error, code){
		if(!returnedError && err instanceof error){
			returnedError = self.code(code, err);
		}
	});
	return returnedError;
};



// OUTPUT METHODS


/*
	function debug([arguments])

	Essentially a console.log wrapper, which is only triggered
	when the application is running in a debug state as defined
	by configuration. Ideally used to output things you don't
	want to see in production.
*/
appframe.prototype.debug = function(){
	if(this.config.debug){
		console.log.apply(this, arguments);
	}
	return this;
};

/*
	function debug([arguments])

	Essentially a console.log wrapper, provides formatting.
*/
appframe.prototype._log = function(opts, type){
	var self = this;
	var day = moment().format(self.config.log.date);
	if(!self.logs.date || self.logs.date !== day){
		self.logs.date = day;
		console.log(helpers.tag(day, chalk.green));
	}
	type = type || 'log';
	console[type](format(self.config.log.format, _.defaults(opts, {
		date: helpers.tag(moment().format(self.config.log.time), chalk.grey)
		//prefix: helpers.tag(self.logs.prefix || null, chalk.grey),
	})));
}
appframe.prototype.info = function(){
	var self = this;
	self._log({
		type: helpers.tag('INFO', chalk.green),
		line: chalk.white(util.format.apply(this, arguments))
	});
	return this;
};

/*
	function debug([arguments])

	Essentially a console.log wrapper, provides formatting.
*/
appframe.prototype.log = function(){
	var self = this;
	self._log({
		type: helpers.tag('LOG', chalk.cyan),
		line: chalk.white(util.format.apply(this, arguments))
	});
	return this;
};

/*
	function debug([arguments])

	Essentially a console.log wrapper, provides formatting.
*/
appframe.prototype.warn = function(){
	var self = this;
	self._log({
		type: helpers.tag('WARN', chalk.yellow),
		line: chalk.yellow(util.format.apply(this, arguments))
	});
	return this;
};

/*
	function debug([arguments])

	Essentially a console.log wrapper, provides formatting.
*/
appframe.prototype.error = function(){
	var self = this;
	self._log({
		type: helpers.tag('ERROR', chalk.red.bold),
		line: chalk.red(util.format.apply(this, arguments))
	}, 'error');
	return this;
};

module.exports = appframe;