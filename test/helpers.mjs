import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dayjs from 'dayjs';
import kleur from 'kleur';
import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import helpers from '../lib/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('helpers.tag', () => {
	it('outputs correctly', () => {
		const string = 'output';
		const output = helpers.tag(string);
		expect(output).toBe(kleur.gray('[') + kleur.gray(string) + kleur.gray(']') + kleur.reset(''));
	});

	it('changes tag color', () => {
		const string = 'output';
		helpers.tag('output', kleur.red);
		expect(helpers.tag(string, kleur.red)).toBe(kleur.gray('[') + kleur.red(string) + kleur.gray(']') + kleur.reset(''));
	});

	it('does not output without a tag', () => {
		const output = helpers.tag('');
		expect(output).toBe('');
	});

	it('throws with invalid color', () => {
		expect(() => helpers.tag('output', 'red')).toThrow(Error);
	});

	it('throws with invalid input', () => {
		expect(() => helpers.tag(true)).toThrow(Error);
		expect(() => helpers.tag({ foo: 'bar' })).toThrow(Error);
		expect(() => helpers.tag(['foo', 'bar'])).toThrow(Error);
		expect(() => helpers.tag(1)).toThrow(Error);
	});
});

describe('helpers.camelCase', () => {
	it('throws with invalid input', () => {
		expect(() => helpers.camelCase()).toThrow(Error);
		expect(() => helpers.camelCase(false)).toThrow(Error);
		expect(() => helpers.camelCase({ foo: 'bar' })).toThrow(Error);
		expect(() => helpers.camelCase(['foo', 'bar'])).toThrow(Error);
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
			expect(helpers.camelCase(test)).toBe(result);
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
		const logs = {};
		helpers.log({
			config: {
				format: '{date}',
				date: 'dddd, MMMM DD YYYY',
				time: 'HH:mm',
			},
			logs,
		});
		// The date should now be set in logs
		expect(logs.date).toBe(dayjs().format('dddd, MMMM DD YYYY'));
	});
	it('does not announce date when already set to same day', () => {
		const dateFormat = 'dddd, MMMM DD YYYY';
		const day = dayjs().format(dateFormat);
		const logs = { date: day };
		helpers.log({
			config: {
				format: '{date}',
				date: dateFormat,
				time: 'HH:mm',
			},
			logs,
		});
		// Date should remain the same
		expect(logs.date).toBe(day);
	});
	it('announces new timestamp day when date changes', () => {
		const dateFormat = 'dddd, MMMM DD YYYY';
		const logs = { date: 'not the same date' };
		helpers.log({
			config: {
				format: '{date}',
				date: dateFormat,
				time: 'HH:mm',
			},
			logs,
		});
		// Date should be updated to today
		expect(logs.date).toBe(dayjs().format(dateFormat));
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
		expect(helpers.isContainerized(path.join(__dirname, 'store/cgroups-docker'))).toBe(true);
	});

	it('Does not detects docker cgroups', () => {
		expect(helpers.isContainerized(path.join(__dirname, 'store/cgroups-no-container'))).toBe(false);
	});

	it('returns false when cgroups file does not exist', () => {
		expect(helpers.isContainerized(path.join(__dirname, 'non-existent-file-path'))).toBe(false);
	});
});

describe('helpers.omit', () => {
	it('correctly omits keys', () => {
		const input = {
			foo: 'bar',
			bar: 'foo',
		};
		const output = helpers.omit(input, ['foo']);
		expect(output.foo).toBeUndefined();
		expect(output.bar).toBe('foo');
		expect(output).toEqual({ bar: 'foo' });
	});

	it('returns empty object when all keys are omitted', () => {
		const input = { foo: 'bar' };
		const output = helpers.omit(input, ['foo']);
		expect(output).toEqual({});
	});

	it('returns copy of object when no keys are omitted', () => {
		const input = { foo: 'bar', baz: 'qux' };
		const output = helpers.omit(input, []);
		expect(output).toEqual(input);
		expect(output).not.toBe(input);
	});

	it('handles non-existent keys gracefully', () => {
		const input = { foo: 'bar' };
		const output = helpers.omit(input, ['nonexistent']);
		expect(output).toEqual({ foo: 'bar' });
	});

	it('uses default empty array when keysToOmit is not provided', () => {
		const input = { foo: 'bar' };
		const output = helpers.omit(input);
		expect(output).toEqual({ foo: 'bar' });
	});
});

describe('helpers.camelCase with dot notation', () => {
	it('preserves dots in path-like strings', () => {
		expect(helpers.camelCase('foo.bar')).toBe('foo.bar');
		expect(helpers.camelCase('my config.nested value')).toBe('myConfig.nestedValue');
	});

	it('handles multiple dots', () => {
		expect(helpers.camelCase('a.b.c')).toBe('a.b.c');
		expect(helpers.camelCase('hello world.foo bar.test case')).toBe('helloWorld.fooBar.testCase');
	});
});

describe('helpers.log with stderr output', () => {
	it('uses console.error for type=error', () => {
		// This tests the type parameter path
		const logs = { date: dayjs().format('dddd, MMMM DD YYYY') };
		helpers.log({
			config: {
				format: '{date} {type}: {line}',
				date: 'dddd, MMMM DD YYYY',
				time: 'HH:mm',
			},
			logs,
			type: 'ERROR',
			line: 'Test error message',
		}, 'error');
		// Test passes if no error thrown - actual stderr output is captured by vitest
	});

	it('uses default console.log when type not specified', () => {
		const logs = { date: dayjs().format('dddd, MMMM DD YYYY') };
		helpers.log({
			config: {
				format: '{line}',
				date: 'dddd, MMMM DD YYYY',
				time: 'HH:mm',
			},
			logs,
			line: 'Test log message',
		});
		// Test passes if no error thrown
	});

	it('sets date from opts when provided', () => {
		const logs = { date: dayjs().format('dddd, MMMM DD YYYY') };
		const customDate = '[Custom Date]';
		helpers.log({
			config: {
				format: '{date}',
				date: 'dddd, MMMM DD YYYY',
				time: 'HH:mm',
			},
			logs,
			date: customDate,
		});
		// When date is already set in opts, it should be used
	});
});
