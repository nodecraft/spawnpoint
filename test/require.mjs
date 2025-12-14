import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import spawnpoint from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('spawnpoint.require', () => {
	const app = new spawnpoint({ cwd: __dirname });
	it('Should require the test autoload-sync file', () => {
		app.require('autoload-sync/sync.js');
		expect(app.customHoistedVarFromAutoload).toBeTruthy();
	});
	// TODO: handle user testing
});
