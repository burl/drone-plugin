import test from 'ava';
import { argParse } from '..';

function main() {
  const {webhook, drone: {buildNumber}} = argParse()
    .arg('webhook=!')
    .parse();
  return {webhook, buildNumber};
}

test('main/happy-path', t => {
  const env = {
    PLUGIN_WEBHOOK: 'https://foo.com/bar',
    DRONE_BUILD_NUMBER: '42',
  };
  const {webhook, buildNumber} = argParse.useEnv(env, main);
  t.true(webhook === 'https://foo.com/bar');
  t.true(buildNumber === 42);
})

test('main/throws, no webhook arg', t => {
  t.throws(() => {
    const env = {
      DRONE_BUILD_NUMBER: '42',
    };
    const {webhook, buildNumber} = argParse.useEnv(env, main);
  }, 'mising required arguments: ["webhook"]');
})
