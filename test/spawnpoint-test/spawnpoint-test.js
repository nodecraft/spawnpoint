'use strict';

/* eslint-disable node/no-extraneous-require */
module.exports = require('../..').registerPlugin({
	dir: __dirname,
	name: "Test",
	namespace: "testB",
	exports: function(app){
		app.config[this.namespace]['test'] = true;
	}
});