'use strict';

const target = require(process.argv[2]);
const _ = require('lodash');

const app = new target(process.argv[3] || '');

process.on('message', (object) => {
	if(object.command){
		if(object.args){
			let out;
			out = app[object.command](...object.args);
			if(out){
				process.send(out);
			}else{
				process.send(undefined);
			}
		}else{
			let out;
			out = app[object.command]();
			if(out){
				process.send(out);
			}else{
				process.send(undefined);
			}
		}
	}
	if(object.set){
		_.set(app, object.set.key, object.set.value);
	}
});
