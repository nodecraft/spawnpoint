'use strict';
const expect = require('unexpected').clone().use(require('unexpected-eventemitter'));
const spawnpoint = require('..');

class customError extends Error{
	constructor(err){
		super(err);
		this.name = 'customError';
	}
}

process.chdir(__dirname);
describe('spawnpoint.registerLimit', () => {
	let app;
	// TODO

	beforeEach(() =>{
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
		let listeners = [];
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
		app.registerLimit('test.code', 1, {}, (data) => {
			app.emit('done', data);
		});
		app.on('done', (data) => {
			expect(data.occurrences, 'to equal', 4);
			done();
		});
		app.setup();
		app.errorCode('test.code');
		app.errorCode('test.code');
	});
});