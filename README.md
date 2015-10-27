# appframe.js
Basic Nodejs framework app object for dependency injection
`npm install appframe --save`

This module is intended to bootstrap an app with a variable to be injected to a system. The configuration file specified dictates autoloaded libs, etc.

More documentation coming soon.
```javascript
'use strict';
var appframe = require('appframe'),
	app = new appframe("./app/config/app.json", __dirname);

app.setup();
```
