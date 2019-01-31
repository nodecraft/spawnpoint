'use strict';
const spawnpoint = require('..');
const os = require('os');

describe('spawnpoint.isRoot', () => {
	it('Should run successfully in linux. Will skip on Windows', function(){
		if(os.platform() === 'win32'){
			this.skip();
		}
		const app = new spawnpoint();
		app.isRoot();
		// TODO: handle user testing
	});
});