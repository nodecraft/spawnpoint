'use strict';
const assert = require('assert');
const spawnpoint = require('..');

// resources for creating tests:
// https://sinonjs.org/
// https://github.com/elliotf/mocha-sinon
// https://github.com/mochajs/mocha/issues/1582

process.chdir(__dirname);

// define custom error for testing
class customError extends Error{
	constructor(err){
		super(err);
		this.name = 'customError';
	}
}

const app = new spawnpoint();
app.setup();
describe('spawnpoint.registerError', () => {
	it('can create a customError for testing', () => {
		assert(new customError('test') instanceof customError, 'customError failed to create test');
	});
	it('can register an error', () => {
		app.registerError('test.code', customError);
		assert(app.errorMaps['test.code']);
	});
});

describe('spawnpoint.registerError', () => {

	it('can register an error', () => {
		assert(app.maskErrorToCode(new customError('test')));
	});

	it('throws when invalid type is passed', () => {
		assert.throws(() => app.maskErrorToCode(new customError('test'), 'invalidError'));
	});

	it('is errorCode', () => {
		assert(app.maskErrorToCode(new customError('test'), 'errorCode') instanceof app._errorCode);
	});

	it('is failCode', () => {
		assert(app.maskErrorToCode(new customError('test'), 'failCode') instanceof app._failCode);
	});
});
