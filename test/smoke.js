import test from 'ava';
import { argParse } from '..';
//const { argParse } = require('../lib/argparse');

test('smoke', t => {
  const env = {
    DRONE_BUILD_NUMBER: '42',
    PLUGIN_FOO: 'bar',
  };
  const args = argParse.useEnv(env, () => argParse().droneEnv);
  t.true(args.hasOwnProperty('buildNumber'), 'has buildNumber');
  t.true(args.buildNumber === 42, 'buildNumber is 42');
});

test('boolean type support', t => {
  const env = {
    PLUGIN_FOO_BOOL: 'true',
    PLUGIN_BAR_BOOL: 'false',
    PLUGIN_TRUE1: 'yes',
    PLUGIN_TRUE2: '1',
    PLUGIN_TRUE3: 'on',
    PLUGIN_BAZ: 'true',
    PLUGIN_UNSTATED: 'true',
    PLUGIN_OTHER: 'stringvalue',
  };
  const args = argParse(env)
    .arg('fooBool=b!');
  t.true(args.schema.fooBool.type === 'boolean');
  t.false(args.schema.hasOwnProperty('barBool'));
  args.boolean('true1', 'true2');

  t.true(args.schema.true1.type === 'boolean');
  t.true(args.schema.true2.type === 'boolean');

  args.boolean(['barBool','true3'], 'baz');
  t.true(args.schema.barBool.type === 'boolean');
  t.true(args.schema.baz.type === 'boolean');
  t.true(args.schema.true3.type === 'boolean');

  const expected = {
    fooBool: true,
    barBool: false,
    true1: true,
    true2: true,
    true3: true,
    baz: true,
    unstated: 'true',
    other: 'stringvalue'
  };

  const values = args.parse();
  delete values.drone;
  t.deepEqual(values, expected, 'boolean coercion');
});

test('number type support', t => {
  const env = {
    PLUGIN_NAME: 'Fred',
    PLUGIN_AGE: '51',
    PLUGIN_BEERS: '7',
    PLUGIN_NOSES: '1',
  };
  const args = argParse(env)
    .number('age', 'beers', 'noses');
  const values = args.parse();
  const expected = {
    name: 'Fred',
    age: 51,
    beers: 7,
    noses: 1,
  }
  delete values.drone;
  t.deepEqual(values, expected, 'numeric coercion');
});

test('many types', t => {
  const env = {
    PLUGIN_NAME: 'Fred',
    PLUGIN_AGE: '51.5',
    PLUGIN_LIKES_BEER: 'Yes',
    PLUGIN_NUMBER_OF_FINGERS: '10',
    PLUGIN_BIRTHDAY: '1966-10-01',
  };
  const expected = {
    name: 'Fred',
    age: 51.5,
    likesBeer: true,
    numberOfFingers: 10,
    birthday: new Date('1966-10-01'),
  };
  const args = argParse(env)
    .number('age','numberOfFingers')
    .boolean('likesBeer')
    .string('name')
    .date('birthday');
  const values = args.parse();
  delete values.drone;
  t.deepEqual(values, expected, 'kitchen-sink test');
});

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
