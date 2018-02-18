import test from 'ava';
import { argParse } from '..';

test('smoke', t => {
  const env = {
    DRONE_BUILD_NUMBER: '42',
    DRONE_UNKNOWN_VARIABLE: 'foo',
    PLUGIN_FOO: 'bar',
    PLUGIN_HORK: '23',
  };
  const pluginEnv = argParse.useEnv(env, () => argParse().plugin);
  const droneEnv = argParse.useEnv(env, () => argParse().drone);
  const ciEnv = argParse.useEnv(env, () => argParse().ci);
  t.true(droneEnv.hasOwnProperty('buildNumber'), 'has buildNumber');
  t.true(droneEnv.buildNumber === 42, 'buildNumber is 42');
  t.true(pluginEnv.hasOwnProperty('foo'));
  t.true(pluginEnv.foo === 'bar');
  t.deepEqual(pluginEnv, {foo: 'bar', hork: '23'});
  t.deepEqual(droneEnv, ciEnv);
});


test('property .env', t => {
  const environ = {
    DRONE_BUILD_NUMBER: '3',
    PLUGIN_FOO: 'bar',
  };
  const { plugin: {foo}, drone: {buildNumber}} = argParse(environ).arg().env;
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

test('drone', t => {
  const env = {
    DRONE_BUILD_NUMBER: '42',
    DRONE_BUILD_STATUS: 'success',
  };
  const { drone } = argParse(env).parse();
  t.true(!!drone, 'drone is defined');
  t.true(drone.buildNumber === 42);
  t.true(drone.buildStatus === 'success');
});
