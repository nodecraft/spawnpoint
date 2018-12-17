'use strict';
const _ = require('lodash');

/**
 * The `roundRobin` class is used to select items from a list in round robin fashion so that no one
 * single item is returned more than it's siblings.
 * @class
 */
class roundRobin{
	//items = []; once implemented: https://github.com/tc39/proposal-class-fields

	/**
	 * Creates new `roundRobin` instance with an array
	 * @param  {Array} items Array of values to perform round robin getting from.
	 */
	constructor(items){
		if(items || !items.length){
			throw new Error('roundRobin.items must be an array with more than 1 item in it.');
		}
		this.items = items;
		this.rrKeys = [];
	}

	/**
	 * Randomly gets next item in the list.
	 * @return {*} Returns next item in the list.
	 */
	next(){
		let keys = _.keys(this.items);
		// ensure our pool exists
		// check if we've filled our RR pool, empty
		let useKey = _.sample(_.xor(keys, this.rrKeys));
		this.rrKeys.push(useKey);
		return this.items[useKey];
	}

	/**
	 * Randomly gets next item in the list.
	 * @return {*} Returns next item in the list.
	 */
	get item(){
		return this.next();
	}

	/**
	 * Resets the used lsit of round robin keys previously used.
	 * @return {this}
	 */
	clear(){
		this.rrKeys = [];
		return this;
	}
}
module.exports = roundRobin;