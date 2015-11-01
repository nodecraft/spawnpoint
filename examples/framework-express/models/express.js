module.exports = function(app, initCallback){
	var _ = require('lodash'),
		express = require('express'),

	app.server = express();

	app.httpServer = app.server.listen(app.config.server.port, function(err){
		if(err){
			// this will halt the setup of the application by passing an error to the initCallback
			return initCallback(err);
		}
		app.info('Server is online!');
		app.emit('app.register', 'express');
		return initCallback();
	});

	// track clients to gracefully close server
	var clients = {};
	app.httpServer.on('connection', function(client){
		client.id = app.random();
		clients[client.id] = client;
		client.once('close', function(){
			delete clients[client.id];
		});
	});
	app.once('app.close', function(){
		app.httpServer.close(function(){
			app.emit('app.deregister', 'express');
		});
		// disconnect each active connection
		_.each(clients, function(client){
			client.destroy();
		});
	});

	// setup error and 404 handles. We use the app.ready event so that we can force it to be the last event
	app.once('app.ready', function(){
		app.server.use(function(req, res){
			app.debug('404 request: %s', req.originalUrl);
			return res.status(404).text('404 not found');;
		});
	});
}