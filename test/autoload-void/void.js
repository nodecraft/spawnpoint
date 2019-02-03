'use strict';

const { fork } = require('child_process');

class ProcessVoid{
	constructor(callback, targetClass, runAsRoot, ...args){
		const targetProto = require(targetClass);
		const target = new targetProto(...args);

		const self = {};
		let forkOptions = {
			'silent': true
		};
		if(typeof(callback) === 'function'){
			self.callback = callback;
		}else{
			self.callback = () => {};
		}

		if(typeof(process.getuid) === 'function'){
			if(process.getuid() !== 0){
				forkOptions.gid = process.getgid();
				forkOptions.uid = process.getuid();
			}else{
				forkOptions.gid = (runAsRoot) ? 0 : 1000;
				forkOptions.uid = (runAsRoot) ? 0 : 1000;
			}
		}
		self.void = fork('./autoload-void.js', [targetClass, ...args], forkOptions);
		target.stdio = self.void.stdio;
		target.stdout = target.stdio[1];
		target.stderr = target.stdio[2];
		const setHandler = {
			set: function(target, key, value){
				return self.void.send({'set': {'key': key, 'value': value}});
			}
		};
		this.set = new Proxy({}, setHandler);

		const runHandler = {
			apply: function(target, thisArg, [path, ...args]){
				let options = { 'command': path };
				if(args){
					options.args = args;
				}
				return new Promise((resolve) => {
					process.once('message', (data) => {
						resolve(data);
					});
					thisArg.void.send(options);
				});
			}
		};

		target.done = function(){
			this.void.disconnect();
			this.callback();
		};

		const appHandler = {
			get: function(target, prop, value){
				if(prop === 'stdout.once'){
					return target.stdout.once;
				}else if(target.hasOwnProperty(prop) && typeof(target[prop]) === 'function'){
					if(typeof(target[prop]) === 'function'){
						let run = new Proxy(target[prop], runHandler);
						run(prop, value).then((result) => {
							return result;
						});
					}else{
						// Do nothing for now
					}
				}else if(prop === 'stdout'){
					return target.stdout;
				}else if(prop === 'stderr'){
					return target.stderr;
				}else if(prop === 'done'){
					return target.done;
				}
			},
			set: function(target, key, value){
				return self.void.send({'set': {'key': key, 'value': value}});
			}
		};

		this.app = new Proxy(target, appHandler);

		process.on("beforeExit", () => {
			this.void.disconnect();
		});

		return this.app;
	}
}

module.exports = ProcessVoid;