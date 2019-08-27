![Spawnpoint Logo](https://raw.githubusercontent.com/nodecraft/spawnpoint/master/logo/logo-banner.png)
[![npm version](https://badge.fury.io/js/spawnpoint.svg)](https://badge.fury.io/js/spawnpoint)
[![dependencies Status](https://david-dm.org/nodecraft/spawnpoint/status.svg)](https://david-dm.org/nodecraft/spawnpoint)
[![Build Status](https://travis-ci.org/nodecraft/spawnpoint.svg?branch=master)](https://travis-ci.org/nodecraft/spawnpoint)
[![Coverage Status](https://coveralls.io/repos/github/nodecraft/spawnpoint/badge.svg)](https://coveralls.io/github/nodecraft/spawnpoint)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fnodecraft%2Fspawnpoint.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fnodecraft%2Fspawnpoint?ref=badge_shield)

# Spawnpoint
Agnostic JS framework that empowers devs to focus on quickly building apps, rather than focusing on application config, health-checks, application structure, or architecture to build a 12 factor app in Docker.

## Quickstart
This quick demo shows that you can create a basic API in just a couple files that's defined by configuration, but is 12 factor ready, Docker ready, and much more! [Check out the full demo here](/examples/express).

`npm install spawnpoint --save`

```javascript
// ~/app.js
const spawnpoint = require('spawnpoint');

const app = new spawnpoint();
app.setup();
```

```javascript
// ~/config/app.json
{
	"name": "Example App",
	"plugins": [
		"spawnpoint-express", // this creates an express server
		"spawnpoint-redis"	// this establishes a connection to a redis server via redisio
	],
	"autoload": [
		// this autoloads all js files in the ~/controllers folder
		{
			"name": "Controllers",
			"folder": "controllers"
		}
	]
}
```

```javascript
// ~/controllers/app.js
module.exports = (app) => {
	// express is already setup and configured via JSON
	app.server.get('/user/:id', (req, res) => {
		// redis is already connected and ready
		app.redis.get(`user:${req.params.id}`, (err, results) => {
			if(err){ res.fail(err); } // automatic error handling

			// return JSON formated success with a success code
			res.success('users.list', {
				user: JSON.parse(results)
			});
		});
	});
};
```


## Plugins
Spawnpoint plugins create opinionated & re-usable components that reduce the code needed to kickstart projects. Plugins are configured via JSON config files, making them easier to share between projects with different needs.

 - [Express](https://github.com/nodecraft/spawnpoint-express) - [Express](https://expressjs.com/): web server
 - [Redis](https://github.com/nodecraft/spawnpoint-redis) - [Redis](https://redis.io/): Key/value database/store
 - [RethinkDB](https://github.com/nodecraft/spawnpoint-rethinkdb) - [RethinkDB](https://rethinkdb.com/): - NoSQL document database
 - [NATS](https://github.com/nodecraft/spawnpoint-nats) - [Nats.io](https://nats.io/): Pub/Sub Message Queue


### Another JS Framework? Why?
We constantly found our dev team rebuilding the same components to our micro services that make up the [Multiplayer Gaming Cloud platform at Nodecraft](https://nodecraft.com). Most of the features had blatant copy/paste to ensure our applications could:

 - Building [12 factor apps](https://12factor.net/)
 - Auto-loading multiple folders for product folder structure
 - File `require()` recursion management overhead [?](#Hoisting%20app)
 - Support basic `--command="args"` that override config files
 - ENV variables that override config files
 - Docker Secrets that override config files
 - Dev config overrides
 - Rebuilding a basic JSON REST API via express
 - Database connect/reconnect management
 - Healthchecks
 - Application lifecycle
   - Tracks app startup
   - Graceful shutdown
 - Making a Docker friendly NodeJS app

### Hoisting app
The most opinionated design choice that Spawnpoint makes is hoisting the entire framework runtime into each file. You can name this variable anything, but the best practice is to name this variable `app`. All system models, libraries, and config are hoisted to this variable with several namespaces:

###### `app.config`
All application config is mounted here. For example `app.config.express` is where all configuration is available to the [spawnpoint-express](https://github.com/nodecraft/spawnpoint-express) plugin.

###### `app.status`
Tracks the current application lifecycle.

###### `app.containerized`
Detects if app is running in a container.

###### `app.cwd`
Returns the main folder where your application lives.

#### Hoisting your own Libraries
When you hoist your library on the `app` variable you can access it on any other autoloaded js file.
```javascript
module.exports = (app) => {
	app.yourLibName = {
		add(a, b){
			return a + b;
		}
	};
}
```
```javascript
app.server.post('/add', (req, res) => {
	// redis is already connected and ready
	let results = app.yourLibName.add(req.body.a, req.body.b);
	res.success('math.add', {
		results: results
	});
});

```


### Framework Examples
 - [ExpressJS: using spawnpoint autoloading](examples/framework-express) - Using Spawnpoint autoloading and plugins to create a HTTP server.
 - [ExpressJS: unframework](examples/framework-express) - Using Spawnpoint core methods to build a basic HTTP server, without the automatic framework.
 - __More coming soon__

### Documentation
Get the [full API Docs here](docs.md).

## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fnodecraft%2Fspawnpoint.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fnodecraft%2Fspawnpoint?ref=badge_large) [![Greenkeeper badge](https://badges.greenkeeper.io/nodecraft/spawnpoint.svg)](https://greenkeeper.io/)
