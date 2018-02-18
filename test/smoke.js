import test from 'ava';
import { argParse } from '..';
//const { argParse } = require('../lib/argparse');

test('smoke', t => {
  const env = {
    DRONE_BUILD_NUMBER: '42',
    DRONE_UNKNOWN_VARIABLE: 'foo',
    PLUGIN_FOO: 'bar',
    PLUGIN_HORK: '23',
  };
  const pluginEnv = argParse.useEnv(env, () => argParse().plugin);
  const droneEnv = argParse.useEnv(env, () => argParse().drone);
  t.true(droneEnv.hasOwnProperty('buildNumber'), 'has buildNumber');
  t.true(droneEnv.buildNumber === 42, 'buildNumber is 42');
  t.true(pluginEnv.hasOwnProperty('foo'));
  t.true(pluginEnv.foo === 'bar');
  t.deepEqual(pluginEnv, {foo: 'bar', hork: '23'});
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
  delete values.ci;
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
  delete values.ci;
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
  delete values.ci;
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

test('object', t => {
  const env = {
    PLUGIN_STUFF: '{"foo":42,"bar":[true,2,"three"]}',
  }
  const { stuff } = argParse(env).arg('stuff={}').parse();
  const expected = {
    foo: 42,
    bar: [true, 2, "three"]
  };
  t.deepEqual(stuff, expected, 'object serialization');
});

test('slice', t => {
  const env = {
    PLUGIN_SLICE_VERSIONS: '1.0.0,1.0,1',
    PLUGIN_SLICE_NUMBERS: '3,2,1',
    PLUGIN_SLICE_STRINGS: 'foo,bar,baz',
    PLUGIN_SLICE_DATES: '2018-02-14,2018-07-04',
    PLUGIN_SLICE_BOOLS: 'true,false,true',
  }
  const { sliceVersions, sliceNumbers, sliceStrings, sliceDates, sliceBools } =
    argParse(env)
      .arg('sliceVersions=[]','sliceNumbers=[n]','sliceStrings=[s]','sliceDates=[d]','sliceBools=[b]')
      .parse();
  t.deepEqual(sliceVersions, ['1.0.0','1.0','1'], 'sliceVersions (strings by default)');
  t.deepEqual(sliceNumbers, [3,2,1], 'slice of numbers');
  t.deepEqual(sliceStrings, ['foo','bar','baz'], 'slice of strings (explicit decl)');
  t.deepEqual(sliceDates, [new Date('2018-02-14'), new Date('2018-07-04')], 'slice of dates');
  t.deepEqual(sliceBools, [true,false,true], 'slice of booleans');
})
