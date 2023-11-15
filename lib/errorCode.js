/* eslint-disable unicorn/custom-error-definition */
'use strict';
const { omit } = require('./helpers.js');

/**
 * Spawnpoint errorCode custom Error. This Error type is used for application errors such as DB errors,
 * system errors, or otherwise system-wide problems not caused by the user.
 * @class
 */
class errorCode extends Error {
	/**
	 * Creates new instance of errorCode
	 * @param {Object} codeObject Error object to create error with. Any unlisted params will be mapped to the `.data` attr.
	 * @param {String} codeObject.code Spawnpoint computer readable string code.
	 * @param {String} codeObject.message Spawnpoint human readable message related to the code.
	 * @param {*} codeObject.* Extra data to attach to the error Code in the `.data` attr.
	 * @return {[type]} new errorCode error
	 */
	constructor(codeObject) {
		// eslint-disable-next-line unicorn/custom-error-definition
		super(codeObject);
		this.name = 'errorCode';
		this.message = codeObject.message;
		this.code = codeObject.code;
		this.data = omit(codeObject, ['code', 'message']);
	}
	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			data: this.data,
		};
	}
}
module.exports = errorCode;
