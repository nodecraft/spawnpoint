'use strict';

/* eslint-disable node/no-extraneous-require */
module.exports = require('../..').registerPlugin({
	dir: __dirname,
	name: 'TestWCallback',
	namespace: 'test',
	callback: true,
	exports: function(app, cb) {
		app.config[this.namespace].test = true;
		cb();
	},
});
