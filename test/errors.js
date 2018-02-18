import test from 'ava';
import { argParse } from '..';

test('errors', t => {
  const noArrayOfObjects = () => {
    argParse().arg('foo=[{}]').parse();
  };
  t.throws(noArrayOfObjects, 'type for \'foo\' declared both object and array. ambiguous.');
});

test('reserved name errors', t => {
  const argNamedDrone = () => {
    argParse().arg('drone', 'foo').parse();
  };
  const argNamedCi = () => {
    argParse().arg('ci', 'foo').parse();
  };
  t.throws(argNamedDrone, 'reserved name drone cant be used as a plugin parameter using this API');
  t.throws(argNamedCi, 'reserved name ci cant be used as a plugin parameter using this API')
});

test('catch-errors', t => {
  const caughtErrors = [];
  const catchErrors = (e) => caughtErrors.push(e);
  const noArrayOfObjects = () => {
    argParse().error(catchErrors).arg('foo=[{}]').parse();
  };
  t.notThrows(noArrayOfObjects);
  t.true(caughtErrors.length === 1);
});

test('error coerce non-bool', t => {
  const coerceNonBool = () => {
    argParse({PLUGIN_FOO:'aardvark'}).boolean('foo').parse();
  };
  t.throws(coerceNonBool, /unable to coerce/);
});
