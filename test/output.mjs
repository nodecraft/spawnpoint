import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import processVoid from './process-void/void.js';

const require = createRequire(import.meta.url);
const spawnpoint = require.resolve('..');

const timeFormat = {
	format: '{date} {type}: {line}',
	time: 'HH:mm',
	date: 'dddd, MMMM DD YYYY',
};

// Pattern to match date line like "[Sunday, December 14 2025]"
const dateLinePattern = /^\[(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day, (January|February|March|April|May|June|July|August|September|October|November|December) ([0-2]?\d|3[01]) \d{4}]\n$/;

// Pattern to match time + log type + message like "[16:30] [LOG]: Test"
const timeLogPattern = /^\[\d{2}:\d{2}] \[LOG]: Test\n$/;
const timeInfoPattern = /^\[\d{2}:\d{2}] \[INFO]: Test\n$/;
const timeWarnPattern = /^\[\d{2}:\d{2}] \[WARN]: Test\n$/;
const timeErrorPattern = /^\[\d{2}:\d{2}] \[ERROR]: Test\n$/;

describe('spawnpoint.debug', () => {
	it('should output Test', () => new Promise((resolve) => {
		const app = new processVoid(resolve, spawnpoint, { construct: true });
		void app.stdout.once('data', (data) => {
			expect(data.toString('utf8')).toBe('Test\n');
			void app.done();
		});
		app.config.debug = true;
		void app.debug('Test');
	}));
});

describe('spawnpoint.log', () => {
	it('should output Test', () => new Promise((resolve) => {
		const app = new processVoid(resolve, spawnpoint, { construct: true });
		app.stdout.once('data', (data) => {
			const output = data.toString('utf8');
			if (dateLinePattern.test(output)) {
				// First output is just the date line, wait for the log line
				app.stdout.once('data', (data) => {
					expect(data.toString('utf8')).toMatch(timeLogPattern);
					void app.done();
				});
			} else {
				// Output may contain date line + log line together due to buffering
				// Extract and verify the log line
				const lines = output.split('\n').filter(Boolean);
				const logLine = lines.find(line => line.includes('[LOG]:'));
				expect(logLine).toBeTruthy();
				expect(logLine + '\n').toMatch(timeLogPattern);
				void app.done();
			}
		});
		app.config.log = timeFormat;
		app.log('Test');
	}));
});

describe('spawnpoint.info', () => {
	it('should output Test', () => new Promise((resolve) => {
		const app = new processVoid(resolve, spawnpoint, { construct: true });
		app.stdout.once('data', (data) => {
			const output = data.toString('utf8');
			if (dateLinePattern.test(output)) {
				// First output is just the date line, wait for the info line
				app.stdout.once('data', (data) => {
					expect(data.toString('utf8')).toMatch(timeInfoPattern);
					void app.done();
				});
			} else {
				// Output may contain date line + info line together due to buffering
				// Extract and verify the info line
				const lines = output.split('\n').filter(Boolean);
				const infoLine = lines.find(line => line.includes('[INFO]:'));
				expect(infoLine).toBeTruthy();
				expect(infoLine + '\n').toMatch(timeInfoPattern);
				void app.done();
			}
		});
		app.config.log = timeFormat;
		app.info('Test');
	}));
});

describe('spawnpoint.warn', () => {
	it('should output Test', () => new Promise((resolve) => {
		const app = new processVoid(resolve, spawnpoint, { construct: true });
		app.stdout.once('data', (data) => {
			expect(data.toString('utf8')).toMatch(dateLinePattern);
		});
		app.stderr.once('data', (data) => {
			expect(data.toString('utf8')).toMatch(timeWarnPattern);
			void app.done();
		});
		app.config.log = timeFormat;
		app.warn('Test');
	}));
});

describe('spawnpoint.error', () => {
	it('should output Test', () => new Promise((resolve) => {
		const app = new processVoid(resolve, spawnpoint, { construct: true });
		app.stdout.once('data', (data) => {
			expect(data.toString('utf8')).toMatch(dateLinePattern);
		});
		app.stderr.once('data', (data) => {
			expect(data.toString('utf8')).toMatch(timeErrorPattern);
			void app.done();
		});
		app.config.log = timeFormat;
		app.error('Test');
	}));
});
