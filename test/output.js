'use strict';
const spawnpoint = require('..');

// resources for creating tests:
// https://sinonjs.org/
// https://github.com/elliotf/mocha-sinon
// https://github.com/mochajs/mocha/issues/1582

process.chdir(__dirname);
describe('spawnpoint.debug', () => {
	const app = new spawnpoint();
	app.setup();
	// TODO
});

describe('spawnpoint.log', () => {
	const app = new spawnpoint();
	app.setup();
	// TODO
});

describe('spawnpoint.info', () => {
	const app = new spawnpoint();
	app.setup();
	// TODO
});

describe('spawnpoint.warn', () => {
	const app = new spawnpoint();
	app.setup();
	// TODO
});

describe('spawnpoint.error', () => {
	const app = new spawnpoint();
	app.setup();
	// TODO
});