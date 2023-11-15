'use strict';
const assert = require('node:assert');

const spawnpoint = require('..');

process.chdir(__dirname);
describe('spawnpoint.require', () => {
	const app = new spawnpoint();
	it('Should require the test autoload-sync file', () => {
		app.require('autoload-sync/sync.js');
		assert(app.customHoistedVarFromAutoload, 'Failed to autoload the file');
	});
	// TODO: handle user testing
});
