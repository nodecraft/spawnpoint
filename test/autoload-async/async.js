'use strict';
module.exports = function(app, initCallback){
	setTimeout(() => {
		app.customHoistedVarFromAutoload = true;
		initCallback();
	}, 1000);
};