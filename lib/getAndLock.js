'use strict';
const _ = require('lodash'),
	async = require('async');

module.exports = function(app){
	/**
	 * The `getAndLock` class is used to select items from a list with a asynchronous lock. The lock prevents
	 * another async from getting the same element that is already locked.
	 * @class
	 */
	class getAndLock{
		//items = []; once implemented: https://github.com/tc39/proposal-class-fields

		/**
		 * Creates new `roundRobin` instance with an array
		 * @param  {Array} items Array of values to perform round robin getting from.
		 */
		constructor(items){
			if(items || !items.length){
				throw new Error('getAndLock.items must be an array with more than 1 item in it.');
			}
			this.items = items;
			this.keys = _.keys(items);
			this.locked = [];
			this.queue = async.queue(this.handleQueue, items.length);
		}

		/**
		 * Randomly gets next item in the list that is not already locked.
		 * @return {*} Returns next item in the list.
		 */
		next(timeout, callback){
			if(timeout && !callback){
				callback = timeout;
				timeout = undefined;
			}
			callback = callback || function(){};

			// set timeout
			if(timeout !== undefined){
				setTimeout(() => {
					hasCB = true;
					return callback(app.failCode('app.config.locked_timeout'), null, function(){});
				}, timeout);
			}

			let hasCB = false;
			return this.queue.push({
				callback: callback,
				hasCB: hasCB
			});
		}
		/**
		 * Queue handler to ensure items are locked and released
		 * @param  {Object} queueItem Request for new item in queue
		 * @param  {Callback} queueItem.callback Request for new item in queue. Once successfully fired will release lock on current item.
		 * @param  {Callback} queueItem.hasCB Checking mechanism to ensure the current request hasn't already called back. This is a reference to the casCB on line #46
		 * @param  {Callback} cb Called when the current item is released.
		 * @private
		 */
		handleQueue(queueItem, cb){
			// ensure timeouts don't lock up the queue
			if(queueItem.hasCB){
				return cb();
			}
			let useKey = _.sample(_.xor(this.keys, this.locked));
			this.locked.push(useKey);
			return queueItem.callback(null, this.items[useKey], () => {
				let index = this.locked.indexOf(useKey);
				this.locked.splice(index, 1);
				return cb();
			});
		}
	}
	return getAndLock;
};