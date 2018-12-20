'use strict';
const _ = require('lodash');

/**
 * Spawnpoint failCode custom Error. This Error type is used for user/validation errors that are human caused.
 * @class
 */
class failCode extends Error{
	/**
	 * Creates new instance of failCode
	 * @param {Object} codeObject Error object to create error with. Any unlisted params will be mapped to the `.data` attr.
	 * @param {String} codeObject.code Spawnpoint computer readable string code.
	 * @param {String} codeObject.message Spawnpoint human readable message related to the code.
	 * @param {*} codeObject.* Extra data to attach to the error Code in the `.data` attr.
	 * @return {[type]} new failCode error
	 */
	constructor(codeObject){
		super(codeObject);
		this.name = 'failCode';
		this.message = codeObject.message;
		this.code = codeObject.code;
		this.data = _.omit(codeObject, ['code', 'message']);
	}
}
module.exports = failCode;