'use strict';
const expect = require('unexpected'),
	dayjs = require('dayjs');
const { fork } = require('child_process');

const timeFormat = {
	format: '{date} {type}: {line}',
	time: "HH:mm:ss",
	date: "dddd, MMMM DD YYYY"
};

// resources for creating tests:
// https://sinonjs.org/
// https://github.com/elliotf/mocha-sinon
// https://github.com/mochajs/mocha/issues/1582

describe('spawnpoint.debug', () => {
	it('should output Test', (done) => {
		const app = fork('./autoload-void', [''], { 'silent': true });
		app.stdout.once('data', (data) => {
			expect(data, 'when decoded as', 'utf-8', 'to equal', 'Test\n');
			app.disconnect();
			done();
		});
		app.send({'set': {'key': 'config.debug', 'value': true}});
		app.send({'command': 'debug', args: ["Test"]});
	});
});

describe('spawnpoint.log', () => {
	it('should output Test', (done) => {
		const app = fork('./autoload-void', [''], { 'silent': true });
		app.stdout.once('data', (data) => {
			let currentTime = dayjs();
			let date = currentTime.format(timeFormat.date);
			expect(data, 'when decoded as', 'utf-8', 'to equal', `[${date}]\n`);
			app.stdout.once('data', (data) => {
				let time = currentTime.format(timeFormat.time);
				expect(data, 'when decoded as', 'utf-8', 'to equal', `[${time}] [LOG]: Test\n`);
				app.disconnect();
				done();
			});
		});
		app.send({"set": {'key': 'config.log', 'value': timeFormat}});
		app.send({'command': 'log', args: ["Test"]});
	});
});

describe('spawnpoint.info', () => {
	it('should output Test', (done) => {
		const app = fork('./autoload-void', [''], { 'silent': true });
		app.stdout.once('data', (data) => {
			let currentTime = dayjs();
			let date = currentTime.format(timeFormat.date);
			expect(data, 'when decoded as', 'utf-8', 'to equal', `[${date}]\n`);
			app.stdout.once('data', (data) => {
				let time = currentTime.format(timeFormat.time);
				expect(data, 'when decoded as', 'utf-8', 'to equal', `[${time}] [INFO]: Test\n`);
				app.disconnect();
				done();
			});
		});
		app.send({"set": {'key': 'config.log', 'value': timeFormat}});
		app.send({'command': 'info', args: ["Test"]});
	});
});

describe('spawnpoint.warn', () => {
	it('should output Test', (done) => {
		const app = fork('./autoload-void', [''], { 'silent': true });
		app.stdout.once('data', (data) => {
			let currentTime = dayjs();
			let date = currentTime.format(timeFormat.date);
			expect(data, 'when decoded as', 'utf-8', 'to equal', `[${date}]\n`);
			app.stderr.once('data', (data) => {
				let time = currentTime.format(timeFormat.time);
				expect(data, 'when decoded as', 'utf-8', 'to equal', `[${time}] [WARN]: Test\n`);
				app.disconnect();
				done();
			});
		});
		app.send({"set": {'key': 'config.log', 'value': timeFormat}});
		app.send({'command': 'warn', args: ["Test"]});
	});
});

describe('spawnpoint.error', () => {
	it('should output Test', (done) => {
		const app = fork('./autoload-void', [''], { 'silent': true });
		app.stdout.once('data', (data) => {
			let currentTime = dayjs();
			let date = currentTime.format(timeFormat.date);
			expect(data, 'when decoded as', 'utf-8', 'to equal', `[${date}]\n`);
			app.stderr.once('data', (data) => {
				let time = currentTime.format(timeFormat.time);
				expect(data, 'when decoded as', 'utf-8', 'to equal', `[${time}] [ERROR]: Test\n`);
				app.disconnect();
				done();
			});
		});
		app.send({"set": {'key': 'config.log', 'value': timeFormat}});
		app.send({'command': 'error', args: ["Test"]});
	});
});