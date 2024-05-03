'use strict';

const _ = require('lodash');

/* eslint-disable unicorn/prefer-spread */
class deepVoid {
	constructor(self, path) {
		const meta = {};
		meta.path = path;
		this.handler = {
			get: function(target, prop/*, receiver*/) {
				const path = _.concat(meta.path, prop);
				const strings = {};
				strings.path = deepVoid.pathToString(path);
				strings.mPath = deepVoid.pathToString(meta.path);
				self.debug(target);
				if (typeof prop === 'string') {
					self.debug('String: ' + strings.path);
				} else if (typeof prop === 'symbol') {
					self.debug('Symbol: ' + strings.path);
				}
				if (_.has(target, prop)) {
					self.debug('target.' + strings.mPath + ' has property ' + prop.toString());
					if (typeof(target[prop]) === 'function') {
						self.debug('target.' + strings.mPath + ' has function ' + prop.toString());
						let run = new Proxy(target[prop], require('./void').getRunHandler(self));
						self.debug(run);
						run = run.bind(null, path);
						self.debug(run);
						return run;
					// eslint-disable-next-line no-constant-condition
					} else if (typeof(target[prop] === 'object')) {
						self.debug('target.' + strings.mPath + ' has object ' + prop.toString());
						// eslint-disable-next-line no-undef
						return new Proxy(target[prop], new deepHandler(self, path).handler);
					}
					// Do nothing for now
				}
			},
			set: async function(target, key, value) {
				self.debug(_.concat(meta.path, key) + ': ' + value);
				return await deepVoid.sendSet(self, _.concat(meta.path, key), value);
				//return self.void.send({'set': {'key': _.concat(meta.path, key), 'value': value}});
			},
		};
	}

	static pathToString(path) {
		return _.join(path, '.');
	}

	static sendSet(self, key, value) {
		return new Promise((resolve/*, reject*/) => {
			/*self.void.once('message', (data) => {
				if(data === 'void continue'){
					return resolve(true);
				}else{
					return reject('did not get a confirmation');
				}
			});
			const success = self.void.send({'set': {'key': key, 'value': value}});*/
			const resultsID = self.bridge.set(key, value);
			self.debug(resultsID);
			// eslint-disable-next-line no-promise-executor-return
			return self.bridge.once(`result_${resultsID}`, resolve);
		});
	}

	static sendGet(self, key) {
		return new Promise((resolve/*, reject*/) => {
			const resultsID = self.bridge.get(key);
			self.debug(resultsID);
			// eslint-disable-next-line no-promise-executor-return
			return self.bridge.once(`result_${resultsID}`, resolve);
		});
	}
}

module.exports = deepVoid;
