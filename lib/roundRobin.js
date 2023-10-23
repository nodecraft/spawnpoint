'use strict';
const path = require('node:path');
const _ = require('lodash');

module.exports = function(app) {

	/**
	 * The `roundRobin` class is used to select items from a list in round robin fashion so that no one
	 * single item is returned more than it's siblings.
	 * @class
	 */
	class roundRobin {
		//items = []; once implemented: https://github.com/tc39/proposal-class-fields

		/**
		 * Creates new `roundRobin` instance with an array
		 * @param  {Array} items Array of values to perform round robin getting from.
		 */
		constructor(items) {
			// ensure error codes are loaded
			if(!app.codes['roundRobin.not_array']) {
				app.registerCodes(require(path.join(__dirname, '../codes/roundRobin.json')));
			}
			if(!items || !Array.isArray(items)) {
				throw app.errorCode('roundRobin.not_array');
			}
			this.items = items;
			this.rrKeys = [];

		}

		/**
		 * Randomly gets next item in the list.
		 * @return {*} Returns next item in the list.
		 */
		next() {
			const keys = _.keys(this.items);
			// ensure our pool exists
			// check if we've filled our RR pool, empty
			const availableKeys = _.xor(keys, this.rrKeys);
			const useKey = _.sample(availableKeys);
			if(!useKey || !this.items[useKey]) {
				throw app.errorCode('roundRobin.error');
			}
			this.rrKeys.push(useKey);
			if(keys.length === this.rrKeys.length) {
				this.clear();
			}
			return this.items[useKey];
		}

		/**
		 * Randomly gets next item in the list.
		 * @return {*} Returns next item in the list.
		 */
		get item() {
			return this.next();
		}

		/**
		 * Resets the used lsit of round robin keys previously used.
		 * @return {this}
		 */
		clear() {
			this.rrKeys = [];
			return this;
		}
	}
	return roundRobin;
};
