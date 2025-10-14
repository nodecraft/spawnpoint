'use strict';
const target = require(process.argv[2]);
const _ = require('lodash');

const app = (process.argv[3] === 'true') ? new target(process.argv[4] || '') : target;

const event = function(object) {
	if (object.command) {
		if (object.args && object.args.length > 0) {
			const out = _.bind(_.get(app, object.command), app)(...object.args);
			if (out && !(out instanceof target)) {
				process.send({ id: object.id, type: 'void response', result: out });
			} else {
				process.send({ id: object.id, type: 'void continue' });
			}
		} else {
			const out = _.result(app, object.command);
			if (_.isUndefined(out) || out instanceof target) {
				process.send({ id: object.id, type: 'void continue' });
			} else if (out) {
				process.send({ id: object.id, type: 'void response', result: out });
			} else if (out === 0) {
				process.send({ id: object.id, type: 'void response', result: 0 });
			} else if (out === false) {
				process.send({ id: object.id, type: 'void response', result: false });
			} else {
				process.send('false');
			}
		}
	} else if (object.set) {
		_.set(app, object.set.key, object.set.value);
		process.send({ id: object.id, type: 'void continue' });
	} else {
		process.send(app);
	}
};

process.on('message', (object) => {
	_.defer(event, object);
});
