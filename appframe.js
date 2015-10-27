'use strict';

var fs = require('fs'),
	crypto = require('crypto'),
	util = require('util'),
	path = require('path'),
	events = require('events');

var _ = require('lodash'),
	async = require('async'),
	chalk = require('chalk'),
	hjson = require('hjson');

var helpers = {
	tag: function(tag, attrs){
		attrs = attrs || chalk.grey;
		return chalk.gray('[') + attrs(tag) + chalk.gray(']') + chalk.reset(' ');
	}
}

var appframe = function(configFile, cwd){
	this.cwd = cwd || __dirname;
	this.running = false;
	if(!(this instanceof appframe)){
		return new appframe(configFile, cwd);
	}

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

	this.config = this.requireJSON(configFile);
	this.config.debug = this.config.debug || false;

	if(process.argv.indexOf('debug') !== -1){
		this.config.debug = true;
	}
	events.EventEmitter.call(this);
	//return this;
}
util.inherits(appframe, events.EventEmitter);

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

	// now, lets handle the init!
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
}
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
appframe.prototype.random = function(length){
	length = parseInt(length) || 16;
	if(isNaN(length) || length < 1){
		length = 16
	}
	var random = String(new Date().getTime() + Math.random());
	return String(crypto.createHash('md5').update(random).digest('hex')).slice(0, length);
},
appframe.prototype.errorCode = function(code, data){
	if(!this.codes[code]){
		throw new Error("No return code found with code: "+ code);
	}
	return _.defaults({
		code: code,
		Error: this.codes[code]
	}, data || {});
};
appframe.prototype.code = function(code){
	if(!this.codes[code]){
		throw new Error("No return code found with code: "+ code);
	}
	return {
		code: code,
		message: this.codes[code]
	};
};
appframe.prototype.debug = function(){
	if(this.config.debug){
		console.log.apply(this, arguments);
	}
};
appframe.prototype.info = function(){
	console.log(helpers.tag('INFO', chalk.green) + chalk.white(util.format.apply(this, arguments)));
};
appframe.prototype.log = function(){
	console.log(helpers.tag('LOG', chalk.cyan) + chalk.white(util.format.apply(this, arguments)));
};
appframe.prototype.warn = function(){
	console.log(helpers.tag('WARN', chalk.yellow) + chalk.yellow(util.format.apply(this, arguments)));
};
appframe.prototype.error = function(){
	console.error(helpers.tag('ERROR', chalk.red.bold) + chalk.red(util.format.apply(this, arguments)));
};
appframe.prototype.isRoot = function(){
	return (process.getuid() === 0 || process.getgid() === 0);
};

module.exports = appframe;