'use strict';
const assert = require('node:assert');
const path = require('node:path');

const async = require('async');
const _ = require('lodash');

module.exports = function(app) {
	/**
	 * The `getAndLock` class is used to select items from a list with a asynchronous lock. The lock prevents
	 * another async from getting the same element that is already locked.
	 * @class
	 */
	class getAndLock {
		//items = []; once implemented: https://github.com/tc39/proposal-class-fields

		/**
		 * Creates new `roundRobin` instance with an array
		 * @param  {Array} items Array of values to perform round robin getting from.
		 */
		constructor(items) {
			// ensure error codes are loaded
			if (!app.codes['getAndLock.not_array'] || !app.codes['getAndLock.locked_timeout']) {
				app.registerCodes(require(path.join(__dirname, '../codes/getAndLock.json')));
			}

			if (!items || !Array.isArray(items)) {
				throw app.errorCode('getAndLock.not_array');
			}
			this.items = items;
			this.keys = _.keys(items);
			this.locked = [];
			this.queue = async.queue((queueItem, cb) => {
				this.handleQueue(queueItem, cb);
			}, items.length);
		}

		/**
		 * Randomly gets next item in the list that is not already locked.
		 * @return {*} Returns next item in the list.
		 */
		next(timeout, callback) {
			if (typeof(timeout) === 'function' && !callback) {
				callback = timeout;
				timeout = 0;
			}
			assert(typeof(timeout) === 'number', '`timeout` must be a number');
			assert(typeof(callback) === 'function', '`callback` must be a function');
			callback = _.once(callback);

			// set timeout
			let hasTimedOut = false;
			if (timeout !== undefined && timeout > 0) {
				setTimeout(() => {
					hasTimedOut = true;
					return callback(app.failCode('getAndLock.locked_timeout'), null, function() {});
				}, timeout);
			}

			return this.queue.push({
				callback: callback,
				hasTimedOut: () => hasTimedOut,
			});
		}
		/**
		 * Queue handler to ensure items are locked and released
		 * @param  {Object} queueItem Request for new item in queue
		 * @param  {Callback} queueItem.callback Request for new item in queue. Once successfully fired will release lock on current item.
		 * @param  {Callback} queueItem.hasTimedOut Checking mechanism to ensure the current request hasn't already called back. This is a reference to the casCB on line #46
		 * @param  {Callback} cb Called when the current item is released.
		 * @private
		 */
		handleQueue(queueItem, cb) {
			// ensure timeouts don't lock up the queue
			if (queueItem.hasTimedOut()) {
				return cb();
			}
			// find unavailable keys
			const availableKeys = _.xor(this.keys, this.locked);
			const useKey = _.sample(availableKeys);
			// set the randomly selected key to be locked
			this.locked.push(useKey);
			return queueItem.callback(null, this.items[useKey], () => {
				const index = this.locked.indexOf(useKey);
				this.locked.splice(index, 1);
				return cb();
			});
		}
	}
	return getAndLock;
};
