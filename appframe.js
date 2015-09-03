var fs = require('fs'),
	crypto = require('crypto')
	_ = require('lodash'),
	path = require('path'),
	hjson = require('hjson');

var framework = function(configFile, cwd){
	var app = {
		cwd: cwd || __dirname,
		requireJSON: function(file){
			return hjson.parse(String(fs.readFileSync(file)));
		},
		recursiveList: function(dir, ext){
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
					var recursive = parent.recursiveList(dir + file);
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
		},
		random: function(length){
			length = parseInt(length) || 16;
			if(isNaN(length) || length < 1){
				length = 16
			}
			var random = String(new Date().getTime() + Math.random());
			return String(crypto.createHash('md5').update(random).digest('hex')).slice(0, length);
		},
		debug: function(){
			if(app.config.debug){
				console.log.apply(this, arguments);
			}
		},
		isRoot: function(){
			return (process.getuid() === 0 || process.getgid() === 0);
		}
	};

	app.config = app.requireJSON(configFile);
	app.config.debug = app.config.debug || false;
	if(process.argv.indexOf('debug') !== -1){
		app.config.debug = true;
	}
	return app;
}


module.exports = framework;
