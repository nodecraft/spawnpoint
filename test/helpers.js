'use strict';
const assert = require('assert');

const _ = require('lodash');
const dayjs = require('dayjs');
const chalk = require('chalk');

const helpers = require('../lib/helpers');

describe('helpers.tag', () => {
	it('outputs correctly', () => {
		helpers.tag('output');
		// TODO: log testing
	});

	it('changes tag color', () => {
		helpers.tag('output', chalk.red);
		// TODO: log testing
	});

	it('does not output without a tag', () => {
		helpers.tag('');
		// TODO: log testing
	});

	it('throws with invalid color', () => {
		assert.throws(() => helpers.tag('output', 'red'), Error);
		// TODO: log testing
	});

	it('throws with invalid input', () => {
		assert.throws(() => helpers.tag(true), Error);
		assert.throws(() => helpers.tag({foo: 'bar'}), Error);
		assert.throws(() => helpers.tag(['foo', 'bar']), Error);
		assert.throws(() => helpers.tag(1), Error);
	});
});

describe('helpers.camelCase', () => {
	it('throws with invalid input', () => {
		assert.throws(() => helpers.camelCase(), Error);
		assert.throws(() => helpers.camelCase(false), Error);
		assert.throws(() => helpers.camelCase({foo: 'bar'}), Error);
		assert.throws(() => helpers.camelCase(['foo', 'bar']), Error);
	});

	it('correctly outputs camelCase', () => {
		const tests = {
			"UPPERCASE": "uppercase",
			"basic camel": "basicCamel",
			"CamelCase": "camelCase",
			"with 1 number": "with1Number",
			"with  multiple      spaces": "withMultipleSpaces",
			"tab\tTest": "tabTest",
			" leading space": "leadingSpace",
			"trailing space ": "trailingSpace"
		};
		_.each(tests, (result, test) => {
			assert(helpers.camelCase(test) === result);
		});
	});
});

describe('helpers.log', () => {
	it('does not log when passed no config', () => {
		helpers.log({
			config: null
		});
		// TODO: detect no logging!
	});
	it('does not log when passed no config format', () => {
		helpers.log({
			config: {
				format: ''
			}
		});
		// TODO: detect no logging!
	});
	it('announces new timestamp day when none is set', () => {
		helpers.log({
			config: {
				format: ''
			},
			logs: {}
		});
		// TODO: detect logging
	});
	it('announces new timestamp day when another date is set', () => {
		const dateFormat = "dddd, MMMM DD YYYY";
		const day = dayjs().format(dateFormat);
		helpers.log({
			config: {
				format: ''
			},
			logs: {
				date: day
			}
		});
		// TODO: detect logging
	});
	it('announces new timestamp day when another day is set', () => {
		const dateFormat = "dddd, MMMM DD YYYY";
		const day = dayjs().format(dateFormat);
		helpers.log({
			config: {
				format: ''
			},
			logs: {
				date: 'not the same date',
				day: day
			}
		});
		// TODO: detect logging
	});
	it('correctly logs with format', () => {
		const dateFormat = "dddd, MMMM DD YYYY";
		const day = dayjs().format(dateFormat);
		helpers.log({
			config: {
				format: '{date} {type}: {line}',
				time: "HH:mm:ss",
				date: dateFormat
			},
			logs: {
				day: day,
				date: day
			}
		});
		// TODO: detect logging
	});
});

describe('helpers.isContainerized', () => {
	it('correctly detects docker cgroups', () => {
		assert(helpers.isContainerized('./store/cgroups-docker'));
	});

	it('Does not detects docker cgroups', () => {
		assert(!helpers.isContainerized('./store/cgroups-no-container'));
	});
});