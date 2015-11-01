var appFrame = require('../appframe.js'),
    express = require('express');

var app = new appFrame('./config.json');

// setup our express server instance
app.server = express();

// by passing in the app we have full access to configuration and express in our controllers.js
require('./controllers.js')(app);

app.server.use(function(req, res){
	app.debug('404 request: %s', req.originalUrl);
	return res.status(404).text('404 not found');;
});

app.server.listen(app.config.server.port, function(err){
	if(err){
		app.error('Failed to startup server');
		app.debug(err);
		return process.exit(1);
	}
	app.info('Server is online!');
});