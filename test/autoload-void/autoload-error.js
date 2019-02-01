'use strict';

const spawnpoint = require('../..');
const _ = require('../../node_modules/lodash');

const app = new spawnpoint(process.argv[2] || '');

process.on('message', (object) => {
	if(object.command){
		if(object.args){
			let out;
			out = app[object.command](...object.args);
			if(object.out){
				process.send(out);
			}
		}else{
			let out;
			out = app[object.command]();
			if(object.out){
				process.send(out);
			}
		}
	}
	if(object.set){
		_.set(app, object.set.key, object.set.value);
	}
});
