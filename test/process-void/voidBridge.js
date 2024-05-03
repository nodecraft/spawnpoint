'use strict';
const EventEmitter = require('node:events');

const _ = require('lodash');

class voidBridge extends EventEmitter {
	constructor(targetClass, bridge) {
		super();

		this.bridge = bridge;

		this.reference = require(targetClass);
		this.exited = false;

		this.referenceMap = _.mapValues(this.reference, value => typeof value);

		this.queue = [];
		this.results = {};
	}

	setup() {
		this.on('register', (task) => {
			this.queue.push(task);
			this.emit('queue.add');
		});
		this.on('queue.add', () => {
			if (this.queue.length === 1) {
				this.emit('queue.open');
			}
		});
		this.on('queue.open', () => {
			if (this.queue.length > 0 && this.exited === false) {
				this.bridge.send(this.queue.shift());
			}
		});
		this.bridge.on('message', this.handleMessage);
		this.bridge.on('exit', (code, signal) => {
			this.exited = { code: code, signal: signal };
			for (const task of this.queue) {
				const id = task.id;
				this.emit('result', id);
				this.emit(`result_${id}`);
			}
			this.emit('exit');
		});
	}

	register(task) {
		const send = task;
		send.id = _.uniqueId();
		this.results[send.id] = undefined;
		this.emit('register', send);
		return send.id;
	}

	handleMessage(message) {
		if (typeof(message) === 'number') {
			if (message & 1) {
				// returning a result.
				let type = message & 6;
				let result;
				let id = message;
				type >>>= 1;
				switch (type) {
					case 0: {
					//boolean
						result = message & 8;
						result = Boolean(result);
						id >>>= 4;
						break;
					}
					case 1: {
					//undefined
						id >>>= 3;
						break;
					}
					case 2:
					//False-like number/string
				}
				this.results[id] = result;
				this.emit('result', id);
				this.emit(`result_${id}`);
				this.emit('queue.open');
			}
		} else if (typeof(message) === 'object') {
			const id = message.id;
			if (message.type === 'void response') {
				_.set(this.results, id, message.result);
			}
			this.emit('result', id);
			this.emit(`result_${id}`);
			this.emit('queue.open');
		}
	}

	set(key, value) {
		return this.register({ set: { key: key, value: value } });
	}

	run(command, ...args) {
		return this.register({ command: command, args: [...args] });
	}

	get(key) {
		return this.register({ command: key });
	}
}

module.exports = voidBridge;
