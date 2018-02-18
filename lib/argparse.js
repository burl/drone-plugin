
const TheEnv = Symbol('env');
const TheSchema = Symbol('schema');
const Throw = Symbol('throw-errors');

// from http://docs.drone.io/environment-reference/
const droneEnvironment = `CI=drone	environment is drone
DRONE=true	environment is drone
DRONE_ARCH	environment architecture (linux/amd64)
DRONE_REPO	repository full name
DRONE_REPO_OWNER	repository owner
DRONE_REPO_NAME	repository name
DRONE_REPO_SCM	repository scm (git)
DRONE_REPO_LINK	repository link
DRONE_REPO_AVATAR	repository avatar
DRONE_REPO_BRANCH	repository default branch (master)
DRONE_REPO_PRIVATE	repository is private
DRONE_REPO_TRUSTED	repository is trusted
DRONE_REMOTE_URL	repository clone url
DRONE_COMMIT_SHA	commit sha
DRONE_COMMIT_REF	commit ref
DRONE_COMMIT_BRANCH	commit branch
DRONE_COMMIT_LINK	commit link in remote
DRONE_COMMIT_MESSAGE	commit message
DRONE_COMMIT_AUTHOR	commit author username
DRONE_COMMIT_AUTHOR_EMAIL	commit author email address
DRONE_COMMIT_AUTHOR_AVATAR	commit author avatar
DRONE_BUILD_NUMBER	build number
DRONE_BUILD_EVENT	build event (push, pull_request, tag)
DRONE_BUILD_STATUS	build status (success, failure)
DRONE_BUILD_LINK	build result link
DRONE_BUILD_CREATED	build created unix timestamp
DRONE_BUILD_STARTED	build started unix timestamp
DRONE_BUILD_FINISHED	build finished unix timestamp
DRONE_PREV_BUILD_STATUS	prior build status
DRONE_PREV_BUILD_NUMBER	prior build number
DRONE_PREV_COMMIT_SHA	prior build commit sha
DRONE_JOB_NUMBER	job number
DRONE_JOB_STATUS	job status
DRONE_JOB_STARTED	job started
DRONE_JOB_FINISHED	job finished
DRONE_BRANCH	commit branch
DRONE_COMMIT	commit sha
DRONE_TAG	commit tag
DRONE_PULL_REQUEST	pull request number
DRONE_DEPLOY_TO	deployment target (ie production)`;

const defaultDroneEnv = {};
const droneCoerce = {
  repoPrivate: 'boolean',
  repoTrusted: 'boolean',
  buildNumber: 'number',
  buildCreated: 'date',
  buildStarted: 'date',
  buildFinished: 'date',
  prevBuildNumber: 'number',
  jobNumber: 'number',
  jobStarted: 'date',
  jobFinished: 'date',
  pullRequest: 'number',
};

(() => {
  for (const line of droneEnvironment.split(/\n/)) {
    line.replace(/^DRONE_(\w+)/, (_, name, _t, t) => {
      name = camelize(name);
      defaultDroneEnv[name] = '';
      if (!droneCoerce.hasOwnProperty(name)) droneCoerce[name] = 'string';
    });
  }
})();

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
  if (res.isArray && res.type === 'object') return except(this, new Error(`type for '${res.name}' declared both object and array. ambiguous.`));
  if (res.isArray) res.type = `[${res.type || 'string'}]`;
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
  object: value => {
    return JSON.parse(value)
  },
};

function coerce(value, type) {
  const fun = toType[type];
  return fun
    ? fun.call(this, value)
    : value;
}

let _useEnv = null;

class Args {
  constructor(env) {
    this[Throw] = null;
    this[TheSchema] = {};
    this[TheEnv] = {
      drone: Object.assign({}, defaultDroneEnv),
      plugin: {},
    };
    const theEnv = env || _useEnv || process.env;
    for (const name of Object.keys(theEnv)) {
      name.replace(/^(PLUGIN|DRONE)_(.+)/, (_, scope, shortName) => {
        const keyName = camelize(shortName);
        this[TheEnv][scope.toLowerCase()][keyName] = theEnv[name];
      });
    }
    for (const name of Object.keys(this.drone)) {
      const type = droneCoerce[name] || 'string';
      this[TheEnv].drone[name] = coerce(this[TheEnv].drone[name], type);
    }
  }
  get schema() {
    return this[TheSchema];
  }
  get drone() {
    return Object.assign({}, this[TheEnv].drone);
  }
  get plugin() {
    return Object.assign({}, this[TheEnv].plugin);
  }
  get ci() {
    return this.drone;
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
    res.drone = this.drone;
    res.ci = res.drone;
    return res;
  }
}

function argParse(...args) {
  return new Args(...args);
}

module.exports = argParse;

module.exports.useEnv = (env, cb, ...args) => {
  const save = _useEnv;
  _useEnv = env;
  const res = cb(...args);
  _useENv = save;
  return res;
};
