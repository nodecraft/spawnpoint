# appframe.js
Basic Nodejs framework app object for dependency injection
`npm install appframe --save`

This modulue is intended to bootstrap an app with a variable to be injected to a system.

```javascript
var appFrame = require('appframe');

var app = appFrame('./config.json');
require('./controllers.js')(app);
// by passing in the app we have full access to configuration and any added libraries (such as a database connection)

```
