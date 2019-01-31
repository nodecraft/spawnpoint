'use strict';
const expect = require('unexpected').clone().use(require('unexpected-eventemitter'));
const spawnpoint = require('..');

process.chdir(__dirname);
describe('spawnpoint.registerLimit', () => {
	const app = new spawnpoint();
	app.config.trackErrors = true;
	app.setup();
	// TODO

	it('should trigger the callback', (done) => {
		app.registerError('test.code', new Error('Test error'));
		app.registerLimit('test.code', 2, () => {
			app.emit('testing.success');
		});
		app.emit('test.code');
		expect(() => app.emit('test.code'), 'to emit from', app, 'testing.success');
		done();
	});
});