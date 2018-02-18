# drone-arg-parse - argument parsing for drone plugins

[![Build Status](https://travis-ci.org/burl/drone-plugin.svg?branch=master)](https://travis-ci.org/burl/drone-plugin) [![npm version](https://badge.fury.io/js/drone-arg-parse.svg)](https://badge.fury.io/js/drone-arg-parse) [![Coverage Status](https://coveralls.io/repos/github/burl/drone-plugin/badge.svg?branch=master)](https://coveralls.io/github/burl/drone-plugin?branch=master)


This package provies an API for parsing and validating the DRONE_*
and PLUGIN_* envvars that are used by drone to pass build context to plugins.

## Installation

```shell
yarn add drone-arg-parse
```

## Example

Assume the following pipeline structure for your plugin in `.drone.yml`

```yaml
pipeline:
  my-plugin:
    image: myrepo/post-message-to-chat
    webhook: 'http://some.chatserver.com/some/path?query=string'
    timeout: 42
```

This module makes it easy to parse, validate and coerce those plugin
parameters as well as the drone build state variables, which are passed
to your plugin in the environment in upper-case variable names.

Example:

```javascript
const { argParse } = require('drone-arg-parse');
const { webhook, timeout = 10, drone:ci } = argParse()
  .arg('webhook=s!', 'timeout=n')
  .parse();

const req = require('request')({
  uri: webhook,
  timeout: (timeout * 1000),
  json: {
    text: `build #${ci.buildNumber} of ${ci.repoName} ${ci.buildStatus}`
  },
});
// and so forth...
```

## Parsing arguments and CI context

drone creates `UPPER_CASE` named envvars for both CI-context and plugin parameters, but for purely aesthetic reasons, this API converts them to `camelCase` representations, dropping the `DRONE_` or `PLUGIN_` prefix.

The `argParse()` function returns an instance of class `Args`, which has various chainable methods for informing the argument parser of the plugin arguments, their types and whether or not they are required.  The `parse()` method returns an object that contains all of this information as well as an embedded object named `drone` with the CI context (all of the `DRONE_` args).

### Argument spec strings

The `.arg()` method can be used to declare argument(s) along with type and demand hints included after an `=` in the name.

| hint char | purpose                       |
| --------- | ----------------------------- |
| s         | string (default when no hint) |
| n         | numeric                       |
| b         | boolean                       |
| d         | date                          |
| o         | object (also {})              |
| a         | array (slice) also []         |
| !         | flag argument as required     |

The `array` type can be combined with a scalar type.

Example:

`.arg('timeout=n', 'title=s!', 'tags=as')`

The above declares two arguments:
* timeout is a numeric argument
* title is a string argument and is required
* tags is an array of strings

The step in the `drone.yml` file that shoudl exist for the above example would look like this:

```yaml
  myplugin:
    image: my/drone-plugin:latest
    timeout: 5
    title: hello world
    tags: [ beta, 1.0.11, latest ]
```

### Args methods

##### .arg(spec[, ...])

*chainable*, this is detailed above.  Note that you may pass a list of argument specs in one call to `.arg()` or you may invoke `.arg()` for each argument you are declaring.

##### .boolean(name [,...])
##### .number(name [,...])
##### .string(name [,...])
##### .date(name [,...])
##### .object(name [,...])

*chainable*, declare an argument as a particular type.  You may append `=!` to any name to indicate that it is a required parameter.

##### .demand(name [,...])

*chainable*, indicate that the named parameter is required.  

##### .parse()

This returns an object containing all of the parsed arguments as well as an embedded object named `drone` that contains the drone CI-context.

### Args properties

##### .drone

The drone environment variables, camelized and coerced.

##### .plugin

The plugin environment variables, camelized.

## License

View the [LICENSE](https://github.com/burl/drone-plugin/blob/master/LICENSE) file
(MIT).
