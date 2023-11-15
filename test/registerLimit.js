'use strict';
const expect = require('unexpected').clone().use(require('unexpected-eventemitter'));

const spawnpoint = require('..');

// eslint-disable-next-line unicorn/custom-error-definition
class customError extends Error {
	constructor(err) {
		super(err);
		this.name = 'customError';
	}
}

process.chdir(__dirname);
describe('spawnpoint.registerLimit', () => {
	let app;
	// TODO

	beforeEach(() => {
		app = new spawnpoint();
	});
	it('should trigger the callback', (done) => {
		app.config.trackErrors = true;
		app.registerError('test.code', customError);
		app.setup();
		app.registerLimit('test.code', 2, () => {
			app.emit('testing.success');
		});
		app.emit('test.code');
		//expect(() => app.emit('test.code'), 'to emit from', app, 'testing.success');
		done();
	});
});

describe('spawnpoint.initLimitListeners', () => {
	let app;

	it('should register errors correctly', (done) => {
		app = new spawnpoint('config/limitErrors.json');
		const listeners = [];
		app.on('newListener', (value) => {
			listeners.push(value);
		});
		app.setup(() => {
			expect(listeners, 'to contain', 'errorCode', 'failCode');
			done();
		});
	});
});

describe('spawnpoint.initLimitListeners.limitToErrors', () => {
	let app;
	beforeEach(() => {
		app = new spawnpoint('config/limitErrors.json');
	});

	it('should run without errors', (done) => {
		app.setup();
		app.errorCode('test.code');
		done();
	});

	it('should correctly handle tracked errors', (done) => {
		app.registerError('test.code', customError);
		app.registerLimit('test.code', 1, { reset: -1 }, (data) => {
			expect(data.occurrences, 'to equal', 1);
			app.config.done = true;
		});
		app.setup();
		app.config.done = false;
		app.errorCode('test.code');
		expect(app.config.done, 'to be true');
		done();
	});

	it('should reset a tracked error', (done) => {
		app.registerError('test.code', customError);
		app.registerLimit('test.code', 2, { reset: 1 }, (data) => {
			expect(data.balance, 'to equal', 2);
			app.config.done++;
		});
		app.setup();
		app.config.done = 0;
		app.errorCode('test.code');
		app.errorCode('test.code');
		expect(app.config.done, 'to equal', 1);
		app.errorCode('test.code');
		app.errorCode('test.code');
		expect(app.config.done, 'to equal', 2);
		done();
	});

	it('should gradually timeout the error', (done) => {
		app.registerError('test.code', customError);
		app.registerLimit('test.code', 2, { time: 100 }, (data) => {
			expect(data.balance, 'to equal', 2);
			expect(data.occurrences, 'to be one of', [2, 5]);
			app.config.done++;
		});
		app.setup();
		app.config.done = 0;
		setTimeout(function() {
			app.errorCode('test.code');
		}, 50);
		setTimeout(function() {
			app.errorCode('test.code');
		}, 100);
		setTimeout(function() {
			app.errorCode('test.code');
		}, 300);
		setTimeout(function() {
			app.errorCode('test.code');
			app.errorCode('test.code');
			expect(app.config.done, 'to equal', 2);
			done();
		}, 500);
	});
});
