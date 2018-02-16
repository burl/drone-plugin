const { argParse } = require('.');
const { webhook, timeout = 10, drone:b } = argParse()
  .arg('webhook=s!', 'timeout=n')
  .parse();

//const req = require('request')(
  console.log({
  uri: webhook,
  timeout: (timeout * 1000),
  json: {
    text: `build #${b.buildNumber} of ${b.repoName} ${b.buildStatus}`
  },
});
// and so forth...
