'use strict';
const spawnpoint = require('..');
//const expect = require('unexpected');

describe('spawnpoint.isSecure', () => {
	if(typeof(process.getuid) === 'function' && process.getuid() === 0) {
		it('Should error when run as root', () => {});
	}else{
		it('Should run successfully', () => {
			const app = new spawnpoint();
			app.isSecure();
			// TODO: handle user testing
		});
	}
});
