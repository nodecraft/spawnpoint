'use strict';


// Include core libs
var fs = require('fs'),
	crypto = require('crypto'),
	util = require('util'),
	path = require('path'),
	events = require('events');

// Include external libraries
var _ = require('lodash'),
	async = require('async'),
	chalk = require('chalk'),
	hjson = require('hjson');


// Define private helper functions
var helpers = {
	tag: function(tag, attrs){
		attrs = attrs || chalk.grey;
		return chalk.gray('[') + attrs(tag) + chalk.gray(']') + chalk.reset(' ');
	}
}

// Actual framework
var appframe = function(configFile, cwd){
	// Useful for tracking the cwd of where the application's file live
	this.cwd = cwd || __dirname;

	// Used to track if the application expects itself to continue running or not
	this.running = false;

	// Helper function to force itself to be a prototype
	if(!(this instanceof appframe)){
		return new appframe(configFile, cwd);
	}

	// Helper method to load JSON
	// TODO: This needs to be moved to other methods, however is needed to load the app config below
	this.requireJSON = function(file, callback){
		if(!callback){
			return hjson.parse(String(fs.readFileSync(file)));
		}
		fs.readFile(file, function(err, contents){
			if(err){
				return callback(err);
			}
			return callback(null, hjson.parse(String(contents)));
		});
	};

	// load the config file as defined
	this.config = this.requireJSON(configFile);

	// Used to track the application debug level
	this.config.debug = this.config.debug || false;
	if(process.argv.indexOf('debug') !== -1){
		this.config.debug = true;
	}

	events.EventEmitter.call(this);
}
util.inherits(appframe, events.EventEmitter);


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

appframe.prototype.setup = function(config, callback){
	var self = this,
		config = config || {},
		callback = callback || function(){};

	// setup registry and events
	this.codes = {};
	self.register = [];
	self.on('app.ready', function(){
		self.running = true;
		// only handle uncaught exceptions when ready
		process.on('uncaughtException', function(err){
			self.error(err.message || err)
			self.debug(err.stack);
			if(!self.running){
				self.emit('app.stop', true);
			}
		});
	})

	// app registry is used to track graceful halting
	self.on('app.register', function(item){
		if(self.register.indexOf(item) === -1){
			self.register.push(item);
		}
	});
	self.on('app.deregister', function(item){
		var i = self.register.indexOf(item)
		if(i !== -1){
			self.register.splice(i, 1);
		}
		if(!self.running && self.register.length < 1){
			self.emit('app.exit', true);
		}
	});
	self.on('app.stop', function(timeout){
		timeout = timeout || 15000;

		self.running = false;
		self.info('Stopping application');
		self.emit('app.close');
		if(self.register.length == 0){
			return self.emit('app.exit', true);
		}
		setTimeout(function(){
			self.emit('app.exit');
		}, timeout);
	});
	self.on('app.exit', function(graceful){
		if(!graceful){
			self.warn('Application did not gracefully close.');
			return process.exit(1);
		}
		self.info('Application gracefully closed.');
		process.exit();
	});

	// gracefully handle ctrl+c
	process.on('SIGINT', function(){
		self.emit('app.stop');
	});


	// App autoloading

	var jobs = [];

	// load codes
	if(self.config.codes){
		jobs.push(function(callback){
			var list = self.recursiveList(util.format('%s/%s', self.cwd, self.config.codes), '.json');
			_.each(list, function(file){
				self.codes = _.defaults(self.codes, self.requireJSON(file));
			});
			return callback();
		});
	}
	// load framework files
	var autoload = _.defaults([], self.config.autoload, config.autoload);
	_.each(autoload, function(jobDetails){
		self.log('Autoloading %s', jobDetails.name || jobDetails.folder);
		var list = self.recursiveList(util.format('%s/%s', self.cwd, jobDetails.folder), jobDetails.extension || '.js');
		if(jobDetails.callback){
			return jobs.push(function(callback){
				async.each(list, function(file, acb){
					require(file)(self, acb);
				}, callback);
			});
		}
		jobs.push(function(callback){
			_.each(list, function(file){
				require(file)(self);
			});
			return callback();
		});
	});
	if(config.init){
		if(!(config.init instanceof Array)){
			config.init = [config.init];
		}
		jobs = jobs.concat(config.init);
	}

	return async.series(jobs, function(err){
		if(err){
			self.error("Failed to start up");
			self.debug(err);
			return process.exit(1);
		}
		self.emit('app.ready');
		self.log('%s is ready.', self.config.name);
	});
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
appframe.prototype.recursiveList = function(dir, ext){
	ext = ext || '.js';
	var parent = this,
		stat = fs.statSync(dir),
		list = [];
	if(!stat.isDirectory()){
		return false;
	}
	dir = String(dir + '/').replace(/\//g, '/'); // ensure proper trailing slash
	_.each(fs.readdirSync(dir), function(file){
		if(fs.statSync(dir + file).isDirectory()){
			var recursive = parent.recursiveList(dir + file, ext);
			if(recursive instanceof Array && recursive.length > 0){
				list = list.concat(recursive); // add results
			}
		}else{
			if(!ext || path.extname(file) === ext){
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

// ERROR CODE METHODS


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
appframe.prototype.code = function(code){
	if(!this.codes[code]){
		throw new Error("No return code found with code: "+ code);
	}
	return {
		code: code,
		message: this.codes[code]
	};
};

/*
	function errorCode(code[ , data])
	*** code - string 
	*** data - object
	
	Similar to the code method above, this returns the
	code, but as an error object. This is useful when
	masking errors or creating new Errors for callbacks

	Returns merged object of code and Error.
*/
appframe.prototype.errorCode = function(code, data){
	if(!this.codes[code]){
		throw new Error("No return code found with code: "+ code);
	}
	return _.defaults({
		code: code,
		Error: this.codes[code]
	}, data || {});
};
// TODO: perhaps throw new error?
appframe.prototype.maskError = appframe.prototype.errorCode;



// OUTPUT METHODS


/*
	function debug([arguements])
	
	Essentially a console.log wrapper, which is only triggered
	when the application is running in a debug state as defined
	by configuration. Ideally used to output things you don't
	want to see in production.
*/
appframe.prototype.debug = function(){
	if(this.config.debug){
		console.log.apply(this, arguments);
	}
};

/*
	function debug([arguements])
	
	Essentially a console.log wrapper, provides formatting.
*/
appframe.prototype.info = function(){
	console.log(helpers.tag('INFO', chalk.green) + chalk.white(util.format.apply(this, arguments)));
};

/*
	function debug([arguements])
	
	Essentially a console.log wrapper, provides formatting.
*/
appframe.prototype.log = function(){
	console.log(helpers.tag('LOG', chalk.cyan) + chalk.white(util.format.apply(this, arguments)));
};

/*
	function debug([arguements])
	
	Essentially a console.log wrapper, provides formatting.
*/
appframe.prototype.warn = function(){
	console.log(helpers.tag('WARN', chalk.yellow) + chalk.yellow(util.format.apply(this, arguments)));
};

/*
	function debug([arguements])
	
	Essentially a console.log wrapper, provides formatting.
*/
appframe.prototype.error = function(){
	console.error(helpers.tag('ERROR', chalk.red.bold) + chalk.red(util.format.apply(this, arguments)));
};

module.exports = appframe;