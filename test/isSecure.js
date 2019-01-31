'use strict';
const spawnpoint = require('..');
const os = require('os');

describe('spawnpoint.isSecure', () => {
	it('Should run successfully', function(){
		if(os.platform() === 'win32'){
			this.skip();
		}
		const app = new spawnpoint();
		app.isSecure();
		// TODO: handle user testing
	});
});