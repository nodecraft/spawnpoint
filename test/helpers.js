'use strict';
const assert = require('node:assert');
const expect = require('unexpected');

const _ = require('lodash');
const dayjs = require('dayjs');
const kleur = require('kleur');
//const processVoid = require('process-void');
//const spawnpoint = require.resolve('..');

const helpers = require('../lib/helpers');

describe('helpers.tag', () => {
	it('outputs correctly', () => {
		const string = 'output';
		const output = helpers.tag(string);
		expect(output, 'to equal', kleur.gray('[') + kleur.gray(string) + kleur.gray(']') + kleur.reset(''));
	});

	it('changes tag color', () => {
		const string = 'output';
		helpers.tag('output', kleur.red);
		expect(helpers.tag(string, kleur.red), 'to equal', kleur.gray('[') + kleur.red(string) + kleur.gray(']') + kleur.reset(''));
	});

	it('does not output without a tag', () => {
		const output = helpers.tag('');
		expect(output, 'to equal', '');
	});

	it('throws with invalid color', () => {
		assert.throws(() => helpers.tag('output', 'red'), Error);
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
			'UPPERCASE': 'uppercase',
			'basic camel': 'basicCamel',
			'CamelCase': 'camelCase',
			'with 1 number': 'with1Number',
			'with  multiple      spaces': 'withMultipleSpaces',
			'tab\tTest': 'tabTest',
			' leading space': 'leadingSpace',
			'trailing space ': 'trailingSpace',
		};
		_.each(tests, (result, test) => {
			assert(helpers.camelCase(test) === result);
		});
	});
});

describe('helpers.log', () => {
	it('does not log when passed no config', () => {
		helpers.log({
			config: null,
		});
		// TODO: detect no logging!
	});
	it('does not log when passed no config format', () => {
		helpers.log({
			config: {
				format: '',
			},
		});
		// TODO: detect no logging!
	});
	it('announces new timestamp day when none is set', () => {
		helpers.log({
			config: {
				format: '',
			},
			logs: {},
		});
		// TODO: detect logging
	});
	it('announces new timestamp day when another date is set', () => {
		const dateFormat = 'dddd, MMMM DD YYYY';
		const day = dayjs().format(dateFormat);
		helpers.log({
			config: {
				format: '',
			},
			logs: {
				date: day,
			},
		});
		// TODO: detect logging
	});
	it('announces new timestamp day when another day is set', () => {
		const dateFormat = 'dddd, MMMM DD YYYY';
		const day = dayjs().format(dateFormat);
		helpers.log({
			config: {
				format: '',
			},
			logs: {
				date: 'not the same date',
				day: day,
			},
		});
		// TODO: detect logging
	});
	it('correctly logs with format', () => {
		const dateFormat = 'dddd, MMMM DD YYYY';
		const day = dayjs().format(dateFormat);
		helpers.log({
			config: {
				format: '{date} {type}: {line}',
				time: 'HH:mm:ss',
				date: dateFormat,
			},
			logs: {
				day: day,
				date: day,
			},
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

describe('helpers.omit', () => {
	it('correctly omits keys', () => {
		const input = {
			foo: 'bar',
			bar: 'foo',
		};
		const output = helpers.omit(input, ['foo']);
		assert(output.foo === undefined);
		assert(output.bar === 'foo');
		assert(output, {bar: 'foo'});
	});
});
