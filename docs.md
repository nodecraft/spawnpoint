## Classes

<dl>
<dt><a href="#spawnpoint">spawnpoint</a></dt>
<dd><p>Agnostic JS framework that empowers devs to focus on quickly building apps, rather than focusing on application
config, health-checks, application structure, or architecture to build a 12 factor app in Docker.</p>
<p>Spawnpoint can be configured to manage the entire application life-cycle or standalone as a utility library.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#callback">callback</a> ⇒ <code>this</code></dt>
<dd><p>Initializes framework to read the <code>configFile</code>, init config, Spawnpoint plugins, errorCodes and autoload
folders. This also starts the application life-cycle so the app can stop gracefully.</p>
</dd>
</dl>

<a name="spawnpoint"></a>

## spawnpoint
Agnostic JS framework that empowers devs to focus on quickly building apps, rather than focusing on applicationconfig, health-checks, application structure, or architecture to build a 12 factor app in Docker.Spawnpoint can be configured to manage the entire application life-cycle or standalone as a utility library.

**Kind**: global class  

* [spawnpoint](#spawnpoint)
    * [new spawnpoint([configFile])](#new_spawnpoint_new)
    * [.recursiveList(dir, [exts])](#spawnpoint+recursiveList) ⇒ <code>Array</code>
    * [.random([length], [hashMethod])](#spawnpoint+random) ⇒ <code>String</code>
    * [.sample(items)](#spawnpoint+sample) ⇒ <code>\*</code>
    * [.roundRobbin(items)](#spawnpoint+roundRobbin) ⇒ <code>roundRobin</code>
    * [.getAndLock(items)](#spawnpoint+getAndLock) ⇒ <code>roundRobin</code>
    * [.isRoot()](#spawnpoint+isRoot) ⇒ <code>Boolean</code>
    * [.isSecure([uid], [gid])](#spawnpoint+isSecure) ⇒ <code>Boolean</code>
    * [.require(path)](#spawnpoint+require)
    * [.code(code, [data])](#spawnpoint+code) ⇒ <code>Object</code>
    * [.errorCode(code, [data])](#spawnpoint+errorCode) ⇒ <code>Object</code>
    * [.failCode(code, [data])](#spawnpoint+failCode) ⇒ <code>Object</code>
    * [.registerLimit(code, threshold, options, callback)](#spawnpoint+registerLimit) ⇒ <code>this</code>
    * [.debug()](#spawnpoint+debug) ⇒ <code>this</code>
    * [.info()](#spawnpoint+info) ⇒ <code>this</code>
    * [.log()](#spawnpoint+log) ⇒ <code>this</code>
    * [.warn()](#spawnpoint+warn) ⇒ <code>this</code>
    * [.error()](#spawnpoint+error) ⇒ <code>this</code>
    * [.registerError(The, Instance)](#spawnpoint+registerError) ⇒ <code>this</code>
    * [.registerErrors(errors)](#spawnpoint+registerErrors) ⇒ <code>this</code>
    * [.maskErrorToCode(error)](#spawnpoint+maskErrorToCode) ⇒ <code>errorCode</code> \| <code>false</code>

<a name="new_spawnpoint_new"></a>

### new spawnpoint([configFile])
Creates new instance of spawnpoint


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [configFile] | <code>string</code> | <code>&quot;/config/app.json&quot;</code> | Sets the JSON file spawnpoint uses to setup the framework. |

<a name="spawnpoint+recursiveList"></a>

### spawnpoint.recursiveList(dir, [exts]) ⇒ <code>Array</code>
Recursively list files in a directory by an optional file extension.NOTE: This is an event blocking sync method.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>Array</code> - Absolute/full path of filenames found.  

| Param | Type | Description |
| --- | --- | --- |
| dir | <code>String</code> | Directory to list files from. |
| [exts] | <code>Array</code> \| <code>string</code> | Optional list of file extensions to return. Defaults to .js files. Set to a falsy value to disable this filter. |

<a name="spawnpoint+random"></a>

### spawnpoint.random([length], [hashMethod]) ⇒ <code>String</code>
Utility: Create random string.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>String</code> - Random string of characters.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [length] | <code>Number</code> | <code>16</code> | How long of a random string to create. |
| [hashMethod] | <code>String</code> | <code>md5</code> | Which crypto hash method to use. |

<a name="spawnpoint+sample"></a>

### spawnpoint.sample(items) ⇒ <code>\*</code>
Utility: get random element from `collection`.This is a copy of the lodash _.sample method.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>\*</code> - Returns the random element.  

| Param | Type | Description |
| --- | --- | --- |
| items | <code>Array</code> \| <code>Object</code> | The collection to sample. |

<a name="spawnpoint+roundRobbin"></a>

### spawnpoint.roundRobbin(items) ⇒ <code>roundRobin</code>
Utility: Creates new `roundRobin` class with collection.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>roundRobin</code> - Returns new instance of `roundRobin` class.  

| Param | Type | Description |
| --- | --- | --- |
| items | <code>Array</code> \| <code>Object</code> | The collection to sample. |

<a name="spawnpoint+getAndLock"></a>

### spawnpoint.getAndLock(items) ⇒ <code>roundRobin</code>
Utility: get random element from `collection` in an async lock.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>roundRobin</code> - Returns new instance of `roundRobin` class.  

| Param | Type | Description |
| --- | --- | --- |
| items | <code>Array</code> \| <code>Object</code> | The collection to sample. |

<a name="spawnpoint+isRoot"></a>

### spawnpoint.isRoot() ⇒ <code>Boolean</code>
Checks if the current application runtime is running as a root user/group.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>Boolean</code> - When true: the application is running as a root user/group.  
<a name="spawnpoint+isSecure"></a>

### spawnpoint.isSecure([uid], [gid]) ⇒ <code>Boolean</code>
Checks if the current application runtime is running as a specific `uid` and/or `gid`.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>Boolean</code> - When true: the application is running as the user/group.  

| Param | Type | Description |
| --- | --- | --- |
| [uid] | <code>Number</code> | Unix `uid` to check against. |
| [gid] | <code>Number</code> | Unix `gid` to check against. When not set will match `uid`. |

<a name="spawnpoint+require"></a>

### spawnpoint.require(path)
Helper method that requires a file and hoists the current spawnpoint application reference.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> | File path to require. |

<a name="spawnpoint+code"></a>

### spawnpoint.code(code, [data]) ⇒ <code>Object</code>
Builds a Spawnpoint code object. Codes are used to create a link between a human readable messageand a computer readable string. Example: `file.not_found` -> "The requested file was not found."

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>Object</code> - Code Object with a `message` with the computer readable message and the `code` matching the input code.  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>String</code> | computer readable string code. |
| [data] | <code>Object</code> | Object to extend the code Object with |

<a name="spawnpoint+errorCode"></a>

### spawnpoint.errorCode(code, [data]) ⇒ <code>Object</code>
Spawnpoint code that wraps a Javascript `Error` as a hard application error.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>Object</code> - Error Code Object with a `message` with the computer readable message and the `code` matching the input code.  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>String</code> | computer readable string code. |
| [data] | <code>Object</code> | Object to extend the code Object with |

<a name="spawnpoint+failCode"></a>

### spawnpoint.failCode(code, [data]) ⇒ <code>Object</code>
Spawnpoint code that wraps a Javascript `Error`, as a soft error.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>Object</code> - Error Code Object with a `message` with the computer readable message and the `code` matching the input code.  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>String</code> | computer readable string code. |
| [data] | <code>Object</code> | Object to extend the code Object with |

<a name="spawnpoint+registerLimit"></a>

### spawnpoint.registerLimit(code, threshold, options, callback) ⇒ <code>this</code>
Error Monitoring, when enabled. This allows you to track how often an error occurs and issue a callback once that threadhold is met.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>String</code> | Spawnpoint code to match against |
| threshold | <code>Number</code> | Number of occurrences required to trigger callback. |
| options | <code>Object</code> | Extra limit options |
| [options.time] | <code>Object</code> | When set, number of milliseconds that the threshold cools down. On each tick this will reduce bv one until it reaches zero. |
| callback | <code>Callback</code> | Triggered when threshold is met. |

<a name="spawnpoint+debug"></a>

### spawnpoint.debug() ⇒ <code>this</code>
Console.log wrapper that only triggers with when `config.debug` is enabled.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Params**: <code>\*</code> [args..] Arguments to be passed to logging.  
<a name="spawnpoint+info"></a>

### spawnpoint.info() ⇒ <code>this</code>
Console.log wrapper that adds an INFO tag and timestamp to the log.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Params**: <code>String\|Object\|Array\|Number</code> [args..] Arguments to be passed to logging.  
<a name="spawnpoint+log"></a>

### spawnpoint.log() ⇒ <code>this</code>
Console.log wrapper that adds an LOG tag and timestamp to the log.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Params**: <code>String\|Object\|Array\|Number</code> [args..] Arguments to be passed to logging.  
<a name="spawnpoint+warn"></a>

### spawnpoint.warn() ⇒ <code>this</code>
Console.error` wrapper that adds an WARN tag and timestamp to the log. This prints to STDERR.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Params**: <code>String\|Object\|Array\|Number</code> [args..] Arguments to be passed to logging.  
<a name="spawnpoint+error"></a>

### spawnpoint.error() ⇒ <code>this</code>
Console.error` wrapper that adds an ERROR tag and timestamp to the log. This prints to STDERR.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Params**: <code>String\|Object\|Array\|Number</code> [args..] Arguments to be passed to logging.  
<a name="spawnpoint+registerError"></a>

### spawnpoint.registerError(The, Instance) ⇒ <code>this</code>
Registers multiple custom Errors to a specific errorCode. This helps wrap errors into a singular errorCode system.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  

| Param | Type | Description |
| --- | --- | --- |
| The | <code>String</code> | errorCode human readable Spawnpoint code. |
| Instance | <code>Error</code> | of the error to map to.. |

<a name="spawnpoint+registerErrors"></a>

### spawnpoint.registerErrors(errors) ⇒ <code>this</code>
Registers multiple custom Errors to a specific errorCode, using the `registerError` method.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  

| Param | Type | Description |
| --- | --- | --- |
| errors | <code>Object</code> | Errors being registered. Each index/key is the errorCode string that the custom Error represents. The Value must be an uninitialized instance of the error. |

<a name="spawnpoint+maskErrorToCode"></a>

### spawnpoint.maskErrorToCode(error) ⇒ <code>errorCode</code> \| <code>false</code>
Checks for Spawnpoint wrapped code, errorCode, or failCode when a potential error map is found (and previously registered). This method is useful as middleware to your applicationerror handling so that you don't have to have the server reply with a generic error.

**Kind**: instance method of [<code>spawnpoint</code>](#spawnpoint)  
**Returns**: <code>errorCode</code> \| <code>false</code> - Returns Spawnpoint mapped code, errorCode, or failCode or false when no mapped error was found.  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | Error to check for mapped error. |

<a name="callback"></a>

## callback ⇒ <code>this</code>
Initializes framework to read the `configFile`, init config, Spawnpoint plugins, errorCodes and autoloadfolders. This also starts the application life-cycle so the app can stop gracefully.

**Kind**: global typedef  
