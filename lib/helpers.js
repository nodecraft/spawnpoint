'use strict';
const fs = require('fs'),
	assert = require('assert');

const _ = require('lodash'),
	chalk = require('chalk'),
	dayjs = require('dayjs'),
	format = require("string-template");

const helpers = {
	/**
	 * Prefixes a log with a tag.
	 * Example: [LOG]
	 * @param  {String} tag Text to display between brackets.
	 * @param  {chalk} attrs Chalk NPM module attributes for styling text.
	 */
	tag(tag, attrs){
		if(tag === ''){
			return '';
		}
		assert(typeof(tag) === 'string', '`tag` must be a string or falsey');
		attrs = attrs || chalk.grey;
		return chalk.gray('[') + attrs(tag) + chalk.gray(']') + chalk.reset('');
	},
	/**
	 * Foramts spaced words into a single camelCase string.
	 * @param  {String} input Text to convert to camelCase
	 * @return {String} cameCase text resulted.
	 */
	camelCase(input){
		return input.split('.').map(function(word){
			return _.camelCase(word);
		}).join('.');
	},
	/**
	 * Log formatter utility. Prefixes with a [TAG] and a date.
	 * Announces a new date when new log occurs on a different date format than before.
	 * @param  {Object} opts Logging arguments & config
	 * @param  {String} type Determines which `console` method is used for logging.
	 * @return {[type]}
	 */
	log(opts, type = 'log'){
		if(!opts.config || !opts.config.format){ return; }
		const currentTime = dayjs();
		const day = currentTime.format(opts.config.date);
		if(!opts.logs.date || opts.logs.date !== day){
			opts.logs.date = day;
			// announce new timestamp day
			console.log(helpers.tag(day, chalk.green));
		}
		opts.date = opts.date || helpers.tag(currentTime.format(opts.config.time), chalk.grey);
		console[type](format(opts.config.format, opts));
	},
	/**
	 * Detects if runtime is in a Docker container.
	 * TODO: Detect other Containerization tools.
	 * @param  {String} cgroupsFile Path to cgroups file to check for container
	 * @return {Boolean} Returns true if a host container was detected
	 */
	isContainerized(cgroupsFile = '/proc/self/cgroups'){
		try{
			const cgroups = fs.readFileSync(cgroupsFile, 'utf8');
			return /[0-9]+:[a-z,=_-]+:\/docker(?:-ce)?\//.test(cgroups);
		}catch(e){
			// file doesn't exist, we're fine
			return false;
		}
	}
};
module.exports = helpers;