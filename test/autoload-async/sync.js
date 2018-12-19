'use strict';
module.exports = function(app, initCallback){
	setTimeout(() => {
		app.autoload = true;
		initCallback();
	}, 1000);
};