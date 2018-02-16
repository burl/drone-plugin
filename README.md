# drone-plugin
> environment and arg parsing for writing drone plugins in node

This package provies an API for parsing and validating the DRONE_*
and PLUGIN_* envvars that are used by drone to pass build context to plugins.

## Installation

```shell
yarn add drone-plugin
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
const { argParse } = require('drone-plugin');
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

## TODO

* add support for deserializing object types, ie: .arg('template={}')
* add support for deserializing "slice" types, ie: .arg('tags=[s]')

## License

View the [LICENSE](https://github.com/burl/drone-plugin/blob/master/LICENSE) file
(MIT).
