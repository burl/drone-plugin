import test from 'ava';
import { argParse } from '..';

function main(...args) {
  const {webhook, ci: {buildNumber}} = argParse(...args)
    .arg('webhook=!')
    .parse();
  return {webhook, buildNumber};
}

test('main/happy-path', t => {
  const env = {
    PLUGIN_WEBHOOK: 'https://foo.com/bar',
    CI_BUILD_NUMBER: '42',
  };
  const {webhook, buildNumber} = main(env);
  t.true(webhook === 'https://foo.com/bar');
  t.true(buildNumber === 42);
})

test('main/throws, no webhook arg', t => {
  t.throws(() => {
    const env = {
      CI_BUILD_NUMBER: '42',
    };
    const {webhook, buildNumber} = main(env);
  }, 'mising required arguments: ["webhook"]');
})
