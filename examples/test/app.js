'use strict';
const _ = require('lodash');

const spawnpoint = require('../../');
const app = new spawnpoint();

app.setup();


app.on('app.ready', function() {
	/* Test Random Sample
	let i = 0;
	while(i < 120){
		i++;
		console.log(app.config.getRandom('example.list'));
		if(i > 0 && i%5 === 0){
			console.log('-----', i);
		}
	}
	*/

	/* Test Round Robbin
	let i = 0;
	while(i < 120){
		i++;
		console.log(app.config.getRoundRobin('example.list'));
		if(i > 0 && i%5 === 0){
			console.log('-----', i);
		}
	}
	*/


	/* Test locking */
	let i = 0;
	let track = 0;
	while (i < 20) {
		i++;
		app.config.getAndLock('example.list', 30000, function(err, result, clear) {
			if (err) { return app.error('Failed').debug(err); }
			console.log(result);
			track++;
			if (track > 0 && track % 5 === 0) {
				console.log('-----', track);
			}
			setTimeout(clear, _.random(2000, 6000));
		});
	}
});
