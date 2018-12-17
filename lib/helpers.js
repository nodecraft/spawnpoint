'use strict';
const _ = require('lodash'),
	chalk = require('chalk'),
	moment = require('moment'),
	format = require("string-template");

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
		var currentTime = moment();
		var day = currentTime.format(opts.config.date);
		if(!opts.logs.date || opts.logs.date !== day){
			opts.logs.date = day;
			// announce new timestamp day
			console.log(helpers.tag(day, chalk.green));
		}
		type = type || 'log';
		opts.date = opts.date || helpers.tag(currentTime.format(opts.config.time), chalk.grey),
		console[type](format(opts.config.format, opts));
	}
};
module.exports = helpers;