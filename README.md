# syrup

**Syrup** is an extremely simple [Promise](http://promises-aplus.github.io/promises-spec/)-based Dependency Injection framework (or rather, a library) for [Node.js](http://nodejs.org). While many related efforts already exist, Syrup attempts to break the mold by focusing on a single feature (dependency resolution) and relying on Node.js for the rest.

## Features

* Configuration-free. No need to set up configuration files just to get up and running.
* Magic-free module loader. It's just `require()` and you'll be the one calling it (i.e. you have full control).
* [Promise](http://promises-aplus.github.io/promises-spec/)-only.
* [Mock-friendly](#mockability). Invoke modules with mock dependencies for easy testing.
* Non-intrusive. You can use Syrup in just one part of your app.
* Runs in parallel with an optional serial mode.

## Mockability

Much like in [Architect](https://github.com/c9/architect), you can invoke modules directly by passing your own mock dependencies to them.

**archive.js**

```javascript
var syrup = require('syrup')

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
chai.use require('sinon-chai')
vat expect = chai.expect

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
