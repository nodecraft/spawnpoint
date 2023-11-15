'use strict';
const assert = require('node:assert');
const fs = require('node:fs');

const dayjs = require('dayjs');
const kleur = require('kleur');
const _ = require('lodash');
const format = require('string-template');

const helpers = {
	/**
	 * Prefixes a log with a tag.
	 * Example: [LOG]
	 * @param  {String} tag Text to display between brackets.
	 * @param  {kleur} attrs kleur NPM module attributes for styling text.
	 */
	tag(tag, attrs) {
		if (tag === '') {
			return '';
		}
		assert(typeof(tag) === 'string', '`tag` must be a string or falsey');
		attrs = attrs || kleur.grey;
		return kleur.gray('[') + attrs(tag) + kleur.gray(']') + kleur.reset('');
	},
	/**
	 * Foramts spaced words into a single camelCase string.
	 * @param  {String} input Text to convert to camelCase
	 * @return {String} cameCase text resulted.
	 */
	camelCase(input) {
		return input.split('.').map(function(word) {
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
	log(opts, type = 'log') {
		if (!opts.config || !opts.config.format) { return; }
		const currentTime = dayjs();
		const day = currentTime.format(opts.config.date);
		if (!opts.logs.date || opts.logs.date !== day) {
			opts.logs.date = day;
			// announce new timestamp day
			console.log(helpers.tag(day, kleur.green));
		}
		opts.date = opts.date || helpers.tag(currentTime.format(opts.config.time), kleur.grey);
		console[type](format(opts.config.format, opts));
	},
	/**
	 * Detects if runtime is in a Docker container.
	 * TODO: Detect other Containerization tools.
	 * @param  {String} cgroupsFile Path to cgroups file to check for container
	 * @return {Boolean} Returns true if a host container was detected
	 */
	isContainerized(cgroupsFile = '/proc/self/cgroups') {
		try {
			const cgroups = fs.readFileSync(cgroupsFile, 'utf8');
			return /\d+:[,=_a-z-]+:\/docker(?:-ce)?\//.test(cgroups);
		} catch {
			// file doesn't exist, we're fine
			return false;
		}
	},

	/**
	 * omit keys from an object. Similar to Lodash omit, but much faster.
	 * @param  {Object} items The source object.
	 * @param  {Array} keysToOmit Keys to omit from the object.
	 * @return {Object} Returns object with requested keys removed.
	 */
	omit(obj, keysToOmit = []) {
		return Object.fromEntries(
			Object.entries(obj)
				.filter(([key]) => !keysToOmit.includes(key)),
		);
	},
};
module.exports = helpers;
