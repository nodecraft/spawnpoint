# appframe.js
Basic Nodejs micro-framework app object for dependency injection, error codes, signal handling, and a few other neat things.
`npm install appframe --save`


## Usage
This module is intended to improve application design by providing a framework to mount your application into a single object. This object, typically named `app` is injected into load file you manually require or autoload (using the framework).

This modulue is intended to bootstrap an application with an object variable, which is injected into each autoloaded file for better application design. 

### Basic Example - Express
In this example, you'll see the most basic setup for this micro-framework where we provide a basic starting point for the injected variable. We load express and setup our controllers in another file.

### Framework Example - Express
In this example, you'll see the typcial use case for using this framework. We autoload express and prevent the application from being online AND create a stateful system for gracefully shutting down the server. Our configuration defines autoloading and other systems. Notice how the controller file for the express route did not change, but was just automatically loaded.

### Documentation

Coming Soon