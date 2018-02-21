import test from 'ava';
import { argParse } from '..';

test('smoke', t => {
  const env = {
    CI_BUILD_NUMBER: '42',
    CI_UNKNOWN_VARIABLE: 'foo',
    PLUGIN_FOO: 'bar',
    PLUGIN_HORK: '23',
  };
  const args = argParse(env);
  const ci = args.ci;
  const plugin = args.plugin;
  t.true(ci.hasOwnProperty('buildNumber'), 'has buildNumber');
  t.true(ci.buildNumber === 42, 'buildNumber is 42');
  t.true(plugin.hasOwnProperty('foo'));
  t.true(plugin.foo === 'bar');
  t.deepEqual(plugin, {foo: 'bar', hork: '23'});
});


test('property .env', t => {
  const environ = {
    CI_BUILD_NUMBER: '3',
    PLUGIN_FOO: 'bar',
  };
  const { plugin: {foo}, ci: {buildNumber}} = argParse(environ).arg().env;
  t.true(foo === 'bar');
  t.true(buildNumber === 3);
})


test('demand', t => {
  const env = {
    PLUGIN_FOO: 'foobar',
    PLUGIN_BAR: '42',
  };
  const expected = {bar:42,foo:'foobar'};
  t.throws(() => {
    const args = argParse(env)
      .number('bar')
      .demand('someUnlistedValue')
      .parse();
    }, Error, 'mising required arguments: ["baz"]');
  t.notThrows(() => {
    const args = argParse(env)
      .number('bar')
      .demand('foo')
      .parse();
    }, Error, 'mising required arguments: ["baz"]');
});

test('ci', t => {
  const env = {
    CI_BUILD_NUMBER: '42',
    CI_BUILD_STATUS: 'success',
  };
  const { ci } = argParse(env).parse();
  t.true(!!ci, 'ci is defined');
  t.true(ci.buildNumber === 42);
  t.true(ci.buildStatus === 'success');
});
