import { describe, it } from 'vitest';

import spawnpoint from '../index.js';

describe('spawnpoint.isSecure', () => {
	if (typeof(process.getuid) === 'function' && process.getuid() === 0) {
		it('Should error when run as root', () => {});
	} else {
		it('Should run successfully', () => {
			const app = new spawnpoint();
			app.isSecure();
			// TODO: handle user testing
		});
	}
});
