'use strict';

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
