# Warning

# This project along with other ones in [OpenSTF](https://github.com/openstf) organisation is provided as is for community, without active development.
# You can check any other forks that may be actively developed and offer new/different features [here](https://github.com/openstf/stf/network).
# Active development has been moved to [DeviceFarmer](https://github.com/DeviceFarmer) organisation.

# syrup

**Syrup** is an extremely simple [Promise](http://promises-aplus.github.io/promises-spec/)-based Dependency Injection framework (or rather, a library) for [Node.js](http://nodejs.org). While many related efforts already exist, Syrup attempts to break the mold by focusing on a single feature (dependency resolution) and relying on Node.js for the rest.

## Features

* Configuration-free. No need to set up configuration files just to get up and running.
* Magic-free module loader. It's just `require()` and you'll be the one calling it (i.e. you have full control).
* [Promise](http://promises-aplus.github.io/promises-spec/)-only.
* [Mock-friendly](#mockability). Invoke modules with mock dependencies for easy testing.
* Non-intrusive. You can use Syrup in just one part of your app.
* Runs in parallel with an optional serial mode.
* Ships TypeScript declarations.

## Requirements

* [Node.js](https://nodejs.org/) 22 or newer. Older versions are not supported.

## Getting started

Install via NPM:

```bash
npm install --save @devicefarmer/stf-syrup
```

A module declares its dependencies with `.dependency()` and its body with `.define()`. The body receives the options followed by the value of every dependency, in the order the dependencies were added:

```javascript
var syrup = require('@devicefarmer/stf-syrup')

var box = syrup()
  .define(function(options) {
    return {
      put: function(thing) {
        return Promise.resolve(thing)
      }
    }
  })

module.exports = syrup({size: 'large'})
  .dependency(box)
  .define(function(options, box) {
    return box
  })
```

`.consume(options)` resolves every dependency, then calls the body and returns a native `Promise` of whatever the body returns (awaited if it is itself a promise). Each module is consumed only once: a module that several others depend on runs once and they all share its value, and every later `.consume()` returns the same promise, whatever options it is given. The options are filled in with the module's default options, the ones given to `syrup()`.

`syrup()` consumes the dependencies in parallel. `syrup.serial()` consumes them one at a time, each one once the previous one has resolved.

### TypeScript

The package is written in TypeScript and ships its declarations. `syrup.Syrup<T>` is the type of a module whose `.consume()` resolves to `T`, and `.define()` infers `T` from the body:

```typescript
import syrup from '@devicefarmer/stf-syrup'

const answer = syrup.serial().define((options: {base: number}) => options.base + 41)
// answer.consume() is a Promise<number>, and answer is a syrup.Syrup<number>
```

### Upgrading from 1.x

`.consume()` used to return a [bluebird](https://github.com/petkaantonov/bluebird) 1.x promise and now returns a native `Promise`. Code that called bluebird-only methods on the result, such as `.spread()`, `.tap()` or `.isFulfilled()`, has to change. As with any native promise, a rejection that nothing handles now makes Node.js exit instead of being logged.

## Mockability

Much like in [Architect](https://github.com/c9/architect), you can invoke modules directly by passing your own mock dependencies to them.

**archive.js**

```javascript
var syrup = require('@devicefarmer/stf-syrup')

module.exports = syrup()
  .dependency(require('./box'))
  .define(function(options, box) {
    return {
      store: function(thing) {
        return box.put(thing)
      }
    }
  })
```

**archive-test.js**

```javascript
var sinon = require('sinon')
var chai = require('chai')
chai.use(require('sinon-chai'))
var expect = chai.expect

var archive = require('./archive')

describe('archive', function() {

  it('should put the thing in the box', function() {
    var mockBox = {
      put: sinon.spy()
    }
    var treasure = 42
    archive.invoke(null, mockBox).store(treasure)
    expect(mockBox.put).to.have.been.calledWith(treasure)
  })

})
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE).

Copyright © CyberAgent, Inc. All Rights Reserved.
