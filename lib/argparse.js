const ciParse = require('cncd-env');

const TheEnv = Symbol('env');
const TheSchema = Symbol('schema');
const Throw = Symbol('throw-errors');

function flatten(arr) {
  return arr.reduce((acc, cur) => acc.concat(cur), []);
}

function camelize(str) {
  return str.toLowerCase().replace(/_+([\w])/g, (_, ch) => ch.toUpperCase());
}

function except(obj, err) {
  if (!!obj[Throw]) return obj[Throw](err);
  throw err;
}

function schematic(item, mutate) {
  this[TheSchema][item] = Object.assign(this[TheSchema][item] || {}, mutate);
  return this[TheSchema][item];
}

function argName(spec) {
  res = {name: spec};
  spec.replace(/^([^=]+)(=(.+))?$/, (_, n, et, t) => {
    res.name = n;
    if (t) {
      for (const ch of t.split('')) {
        switch(ch) {
        case 's': res.type = 'string'; break;
        case 'n': res.type = 'number'; break;
        case 'b': res.type = 'boolean'; break;
        case 'd': res.type = 'date'; break;
        case 't': res.type = 'timestamp'; break;
        case 'o':
        case '{':
        case '}': res.type = 'object'; break;
        case 'a':
        case '[':
        case ']': res.isArray = true; break;
        case '!': res.demand = true; break;
        }
      }
    }
  });
  if (res.isArray) {
    if (res.type === 'object') return except(this, new Error(`type for '${res.name}' declared both object and array. ambiguous.`));
    res.type = `[${res.type}]`;
  }
  return res;
}

function schemaWork(settings, ...specs) {
  for (const item of flatten(specs)) {
    const info = argName.call(this, item);
    const name = info.name;
    if (name === 'drone' || name === 'ci') {
      except(this, new Error(`reserved name ${name} cant be used as a plugin parameter using this API`));
    }
    schematic.call(this, name, Object.assign({}, info, settings, {name}));
  }
  return this;

}

// from string to ...
const toType = {
  boolean: value => {
    if (value === '' || value === null || value === undefined) return false;
    if (RegExp(/^true|yes|on|1$/i).test(value)) return true;
    if (RegExp(/^false|no|off|0$/i).test(value)) return false;
    except(this, new Error(`unable to coerce value as boolean (${value})`));
  },
  '[boolean]': value => value.split(/,/).map(b => toType.boolean(b)),
  number: value => {
    return parseFloat(value);
  },
  '[number]': value => value.split(/,/).map(n => parseFloat(n)),
  string: value => value,
  '[string]': value => value.split(/,/),
  date: value => {
    if (/^\d+$/.test(value)) return new Date(1000 * parseInt(value));
    return new Date(value);
  },
  '[date]': value => value.split(/,/).map(d => toType.date(d)),
  'timestamp': value => new Date(1000 * parseInt(value)),
  '[timestamp]': value => value.split(/,/).map(t => toType.timestamp(t)),
  object: value => {
    return JSON.parse(value)
  },
};

function coerce(value, type) {
  return toType[type].call(this, value);
}

class Args {
  constructor(useEnv = process.env) {
    this[Throw] = null;
    this[TheSchema] = {};
    this[TheEnv] = {
      ci: ciParse(useEnv).vars,
      plugin: {},
    };
    for (const name of Object.keys(useEnv)) {
      name.replace(/^PLUGIN_(.+)/, (_, shortName) => {
        const keyName = camelize(shortName);
        this[TheEnv].plugin[keyName] = useEnv[name];
      });
    }
  }
  get schema() {
    return this[TheSchema];
  }
  get plugin() {
    return Object.assign({}, this[TheEnv].plugin);
  }
  get ci() {
    return this[TheEnv].ci;
  }
  get env() {
    return Object.assign({}, this[TheEnv]);
  }
  schemaFor(name) {
    const defaultSchema = {
      type: 'string',
      demand: 'false',
      known: false,
    };
    let thisSchema = this.schema.hasOwnProperty(name)
      ? this.schema[name]
      : {};
    return Object.assign({}, defaultSchema, thisSchema);
  }
  boolean(...args) {
    return schemaWork.call(this, {type: 'boolean'}, ...args);
  }
  number(...args) {
    return schemaWork.call(this, {type: 'number'}, ...args);
  }
  string(...args) {
    return schemaWork.call(this, {type: 'string'}, ...args);
  }
  date(...args) {
    return schemaWork.call(this, {type: 'date'}, ...args);
  }
  object(...args) {
    return schemaWork.call(this, {type: 'object'}, ...args);
  }
  arg(...args) {
    return schemaWork.call(this, {}, ...args);
  }
  error(cb) {
    this[Throw] = cb;
    return this;
  }

  demand(...args) {
    for (const arg of flatten(args)) {
      schematic.call(this, arg, {name: arg, demand: true});
    }
    return this;
  }
  parse() {
    const res = {};
    const demand = {};
    for (const arg of Object.values(this[TheSchema])) {
      if (arg.demand) demand[arg.name] = true;
    }
    for (const key of Object.keys(this[TheEnv].plugin)) {
      const value = this[TheEnv].plugin[key];
      const schema = this.schemaFor(key);
      res[key] = coerce(value, schema.type);
      delete demand[key];
    }
    const missing = Object.keys(demand);
    if (missing.length) {
      except(this, new Error(`mising required arguments: ${JSON.stringify(missing)}`));
    }
    res.ci = this[TheEnv].ci;
    return res;
  }
}

function argParse(...args) {
  return new Args(...args);
}

module.exports = argParse;
