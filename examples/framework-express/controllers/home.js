'use strict';
module.exports = function(app){
    // inside this function, we have a reference to the app variable. As it's updated here or in other files we will get those changes. This is NOT a copy of the variable but a reference which changes as the variable itself changes
	app.emit('server.middleware', function(req, res, next){
    	console.log('give me your middleware');
    	next();
	});

	app.server.get('/home', function(req, res){
    	setTimeout(function(){
        	return res.send('welcome home!');
    	}, 7500);
	});

	app.server.post('/validate', app.server.validate({
    	body: {
    		user: app.joi.string().required(),
    		email: app.joi.string().email(),
    	}
	}), function(req, res){
    	if(req.body.user.length < 2){
    		return res.invalid({
    			'user': app.code('user.username_length')
    		});
    	}
    	res.success('user.valid', req.body);
	});
};