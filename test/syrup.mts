import sinon from 'sinon'
import * as chai from 'chai'
import sinonChai from 'sinon-chai'

chai.use(sinonChai)
const expect = chai.expect

import syrupIndex from '../index.js'
import parallel from '../lib/parallel.js'
import serial from '../lib/serial.js'

type Factory = typeof parallel | typeof serial

// Lets a test settle every pending promise callback.
const tick = () => new Promise(resolve => setImmediate(resolve))

// A promise that records whether it has settled, like bluebird's
// isFulfilled() which the CoffeeScript suite used.
const track = <T,>(promise: Promise<T>) => {
  const state = { fulfilled: false }
  promise.then(
    () => {
      state.fulfilled = true
    },
    () => {}
  )
  return state
}

// Resolves to the reason the given promise rejects with, and fails if it
// fulfils instead.
const rejection = async (promise: PromiseLike<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected the promise to reject')
}

const tests = (syrup: Factory) => () => {
  it('should export the Syrup class via .Syrup property', () => {
    expect(syrup.Syrup).to.be.a('function')
  })

  it('should export a function which returns a Syrup instance', () => {
    expect(syrup()).to.be.an.instanceOf(syrup.Syrup)
  })

  describe('.define()', () => {
    it('should set the body', () => {
      const main = syrup()
      const body = () => {}
      main.define(body)
      expect(main.body).to.equal(body)
    })

    it('should return the Syrup instance', () => {
      const main = syrup()
      expect(main.define(() => {})).to.equal(main)
    })
  })

  describe('.dependency()', () => {
    it('should throw if dependency is undefined', () => {
      const main = syrup()
      expect(() => main.dependency(undefined as never)).to.throw(
        'Dependency is undefined; perhaps the module is missing module.exports?'
      )
    })

    it("should throw if dependency doesn't have consume method", () => {
      const main = syrup()
      const fake = () => {}
      expect(() => main.dependency(fake as never)).to.throw(
        "Dependency is missing `.consume()` method. Perhaps it's not a Syrup module?"
      )
    })

    it('should add Syrup dependency', () => {
      const main = syrup()
      const dep = syrup()
      main.dependency(dep)
      expect(main.dependencies).to.eql([dep])
    })

    it('should add unknown dependency with consume method', () => {
      const main = syrup()
      const dep = {
        consume: () => Promise.resolve()
      }
      main.dependency(dep)
      expect(main.dependencies).to.eql([dep])
    })

    it('should return the Syrup instance', () => {
      const main = syrup()
      expect(main.dependency(syrup())).to.equal(main)
    })
  })

  describe('.invoke()', () => {
    it('should pass options as first argument', () => {
      const spy = sinon.spy()
      const opts = {
        foo: 'bar'
      }
      const main = syrup().define(spy)
      main.invoke(opts)
      expect(spy).to.have.been.calledWith(opts)
    })

    it('should invoke the body with given arguments', () => {
      const spy = sinon.spy()
      const main = syrup()
      main.define(spy)
      const opts = {
        red: 'blue'
      }
      main.invoke(opts, 1, 2, 3)
      expect(spy).to.have.been.calledOnce
      expect(spy).to.have.been.calledWith(opts, 1, 2, 3)
    })

    it('should pass empty object as options if not given and no defaults apply', () => {
      const spy = sinon.spy()
      const main = syrup().define(spy)
      main.invoke(null)
      expect(spy).to.have.been.calledWith({})
    })

    it('should should use default options if given', () => {
      const opts = {
        foo: 'bar'
      }
      const spy = sinon.spy()
      const main = syrup(opts).define(spy)
      main.invoke()
      expect(spy).to.have.been.calledWith(opts)
    })

    it('should extend default options with given options', () => {
      const opts = {
        foo: 'bar',
        hi: 'ho'
      }
      const spy = sinon.spy()
      const main = syrup(opts).define(spy)
      main.invoke({ yes: 'no', foo: 'foo' })
      expect(spy).to.have.been.calledWith({ foo: 'foo', yes: 'no', hi: 'ho' })
    })

    it('should throw if body has not been set yet', () => {
      const main = syrup()
      expect(() => main.invoke()).to.throw(
        'Unable to `.invoke()` before setting body via `.define()`'
      )
    })

    it("should return body's return value", () => {
      const main = syrup()
      main.define(() => 7288)
      expect(main.invoke()).to.equal(7288)
    })

    // Not covered by the CoffeeScript suite.

    it('should not consume the real dependencies', () => {
      const dep = syrup().define(() => 'real')
      const spy = sinon.spy(dep, 'consume')
      const body = sinon.spy()
      syrup().dependency(dep).define(body).invoke(null, 'mock')
      expect(spy).to.not.have.been.called
      expect(body).to.have.been.calledWith({}, 'mock')
    })

    it('should return a promise from the body as is', () => {
      const promise = Promise.resolve(1)
      expect(
        syrup()
          .define(() => promise)
          .invoke()
      ).to.equal(promise)
    })

    it('should fill in the given overrides object rather than a copy', () => {
      const overrides: Record<string, unknown> = { foo: 'foo' }
      const spy = sinon.spy()
      syrup({ foo: 'bar', hi: 'ho' }).define(spy).invoke(overrides)
      expect(spy.firstCall.args[0]).to.equal(overrides)
      expect(overrides).to.eql({ foo: 'foo', hi: 'ho' })
    })

    it('should only fill in options that are undefined', () => {
      const spy = sinon.spy()
      syrup({ a: 1, b: 2, c: 3 })
        .define(spy)
        .invoke({ a: null, b: undefined, c: 0 })
      expect(spy).to.have.been.calledWith({ a: null, b: 2, c: 0 })
    })

    it('should fill in inherited default options too', () => {
      const defaults = Object.create({ inherited: 'yes' })
      defaults.own = 'also'
      const spy = sinon.spy()
      syrup(defaults).define(spy).invoke()
      expect(spy).to.have.been.calledWith({ inherited: 'yes', own: 'also' })
    })

    it('should call the body without a this value', () => {
      const spy = sinon.spy()
      syrup().define(spy).invoke()
      expect(spy.firstCall.thisValue).to.equal(null)
    })
  })

  describe('.consume()', () => {
    it('should return a Promise', () => {
      const main = syrup()
      main.define(() => {})
      expect(main.consume()).to.be.an.instanceOf(Promise)
    })

    it('should always return the same Promise', () => {
      const main = syrup()
      main.define(() => {})
      expect(main.consume()).to.equal(main.consume())
    })

    it('should consume all dependencies', async () => {
      const dep1 = syrup().define(() => {})
      const dep2 = syrup().define(() => {})
      const main = syrup()
        .dependency(dep1)
        .dependency(dep2)
        .define(() => {})
      const spy1 = sinon.spy(dep1, 'consume')
      const spy2 = sinon.spy(dep2, 'consume')
      await main.consume()
      expect(spy1).to.have.been.calledOnce
      expect(spy2).to.have.been.calledOnce
    })

    it('should wait for body promise to resolve', async () => {
      const resolver = Promise.withResolvers<number>()
      const main = syrup().define(() => resolver.promise)
      const value = track(main.consume())
      await tick()
      expect(value.fulfilled).to.be.false
      resolver.resolve(1)
      await tick()
      expect(value.fulfilled).to.be.true
    })

    it('should wait for dependencies to resolve', async () => {
      const resolver = Promise.withResolvers<number>()
      const dep = syrup().define(() => resolver.promise)
      const main = syrup()
        .dependency(dep)
        .define(() => {})
      const value = track(main.consume())
      await tick()
      expect(value.fulfilled).to.be.false
      resolver.resolve(1)
      await tick()
      expect(value.fulfilled).to.be.true
    })

    it('should pass given options to body as first argument', async () => {
      const opts = {
        a: 5,
        b: 6,
        c: {
          d: 9
        }
      }
      const spy = sinon.spy()
      await syrup().define(spy).consume(opts)
      expect(spy).to.have.been.calledWith(opts)
    })

    it('should pass given options to dependencies', async () => {
      const opts = {
        a: 5,
        c: {
          d: 9
        },
        b: 26
      }
      const spy = sinon.spy()
      const dep = syrup().define(spy)
      const main = syrup()
        .dependency(dep)
        .define(() => {})
      await main.consume(opts)
      expect(spy).to.have.been.calledWith(opts)
    })

    it('should pass empty object as options if not given and no defaults apply', async () => {
      const spy = sinon.spy()
      await syrup().define(spy).consume()
      expect(spy).to.have.been.calledWith({})
    })

    it('should should use default options if given', async () => {
      const opts = {
        foo: 'bar'
      }
      const spy = sinon.spy()
      await syrup(opts).define(spy).consume()
      expect(spy).to.have.been.calledWith(opts)
    })

    it('should extend default options with given options', async () => {
      const opts = {
        foo: 'bar',
        hi: 'ho'
      }
      const spy = sinon.spy()
      await syrup(opts).define(spy).consume({ yes: 'no', foo: 'foo' })
      expect(spy).to.have.been.calledWith({ foo: 'foo', yes: 'no', hi: 'ho' })
    })

    it('should pass resolved values as arguments to body', async () => {
      const resolver1 = Promise.withResolvers<number>()
      const dep1 = syrup().define(() => resolver1.promise)
      const resolver2 = Promise.withResolvers<number>()
      const dep2 = syrup().define(() => resolver2.promise)
      const spy = sinon.spy()
      const opts = {
        foo: 'bar'
      }
      const main = syrup().dependency(dep1).dependency(dep2).define(spy)
      const value = main.consume(opts)
      resolver1.resolve(1)
      resolver2.resolve(2)
      await value
      expect(spy).to.have.been.calledWith(opts, 1, 2)
    })

    // Not covered by the CoffeeScript suite.

    it("should resolve to the body's awaited return value", async () => {
      const main = syrup().define(() => Promise.resolve('value'))
      expect(await main.consume()).to.equal('value')
    })

    it('should invoke the body asynchronously even without dependencies', async () => {
      const spy = sinon.spy()
      const value = syrup().define(spy).consume()
      expect(spy).to.not.have.been.called
      await value
      expect(spy).to.have.been.calledOnce
    })

    it('should return the first result whatever the later overrides', async () => {
      const spy = sinon.spy((options: object) => options)
      const main = syrup().define(spy)
      const first = main.consume({ call: 1 })
      expect(main.consume({ call: 2 })).to.equal(first)
      expect(await first).to.eql({ call: 1 })
      expect(spy).to.have.been.calledOnce
    })

    it('should consume a shared dependency once and share its value', async () => {
      const shared = sinon.spy(() => ({}))
      const dep = syrup().define(shared)
      const left = syrup()
        .dependency(dep)
        .define((options: object, value: object) => value)
      const right = syrup()
        .dependency(dep)
        .define((options: object, value: object) => value)
      const main = syrup()
        .dependency(left)
        .dependency(right)
        .define((options: object, a: object, b: object) => [a, b])
      const [a, b] = await main.consume()
      expect(shared).to.have.been.calledOnce
      expect(a).to.equal(b)
    })

    it('should reject when the body throws', async () => {
      const error = new Error('body')
      const value = syrup()
        .define(() => {
          throw error
        })
        .consume()
      expect(await rejection(value)).to.equal(error)
    })

    it('should keep returning the same rejected Promise', async () => {
      const body = sinon.spy(() => Promise.reject(new Error('body')))
      const main = syrup().define(body)
      const first = main.consume()
      await first.catch(() => {})
      expect(main.consume()).to.equal(first)
      expect(body).to.have.been.calledOnce
    })

    it('should reject without invoking the body when a dependency rejects', async () => {
      const error = new Error('dependency')
      const dep = syrup().define(() => Promise.reject(error))
      const body = sinon.spy()
      const value = syrup().dependency(dep).define(body).consume()
      expect(await rejection(value)).to.equal(error)
      expect(body).to.not.have.been.called
    })

    it('should reject when consumed before a body is defined', async () => {
      expect(await rejection(syrup().consume())).to.have.property(
        'message',
        'Unable to `.invoke()` before setting body via `.define()`'
      )
    })

    it('should throw rather than reject when the first dependency throws', () => {
      const error = new Error('consume')
      const main = syrup()
        .dependency({
          consume: () => {
            throw error
          }
        })
        .define(() => {})
      expect(() => main.consume()).to.throw(error)
      expect(main.resolved).to.equal(null)
    })

    it('should let the dependencies fill in the shared overrides object', async () => {
      const overrides: Record<string, unknown> = {}
      const dep = syrup({ fromDep: 'dep' }).define(() => {})
      const spy = sinon.spy()
      await syrup({ fromMain: 'main' })
        .dependency(dep)
        .define(spy)
        .consume(overrides)
      expect(spy.firstCall.args[0]).to.equal(overrides)
      expect(overrides).to.eql({ fromDep: 'dep', fromMain: 'main' })
    })
  })
}

describe('ParallelSyrup', tests(parallel))
describe('SerialSyrup', tests(serial))

describe('syrup', () => {
  it('should export the parallel factory', () => {
    expect(syrupIndex).to.equal(parallel)
    expect(syrupIndex()).to.be.an.instanceOf(parallel.Syrup)
  })

  it('should export the serial factory as .serial', () => {
    expect(syrupIndex.serial).to.equal(serial)
    expect(syrupIndex.serial()).to.be.an.instanceOf(serial.Syrup)
  })

  it('should make a serial Syrup a parallel Syrup too', () => {
    expect(syrupIndex.serial()).to.be.an.instanceOf(syrupIndex.Syrup)
  })

  it('should be loadable with require()', async () => {
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const syrup = require('..')
    expect(syrup).to.equal(syrupIndex)
    expect(syrup.serial).to.equal(serial)
  })
})

describe('ParallelSyrup ordering', () => {
  it('should consume every dependency before any of them resolves', () => {
    const first = Promise.withResolvers<number>()
    const dep1 = { consume: sinon.spy(() => first.promise) }
    const dep2 = { consume: sinon.spy(() => Promise.resolve(2)) }
    parallel()
      .dependency(dep1)
      .dependency(dep2)
      .define(() => {})
      .consume()
    expect(dep1.consume).to.have.been.calledOnce
    expect(dep2.consume).to.have.been.calledOnce
    first.resolve(1)
  })

  it('should consume every dependency even if one rejects', async () => {
    const dep1 = { consume: () => Promise.reject(new Error('dep1')) }
    const dep2 = { consume: sinon.spy(() => Promise.resolve(2)) }
    const value = parallel()
      .dependency(dep1)
      .dependency(dep2)
      .define(() => {})
      .consume()
    expect(await rejection(value)).to.have.property('message', 'dep1')
    expect(dep2.consume).to.have.been.calledOnce
  })

  it('should handle the earlier promises when a later dependency throws', () => {
    const pending = { then: sinon.spy() }
    const error = new Error('dep2')
    const dep1 = { consume: () => pending }
    const dep2 = {
      consume: () => {
        throw error
      }
    }
    const main = parallel()
      .dependency(dep1)
      .dependency(dep2)
      .define(() => {})
    expect(() => main.consume()).to.throw(error)
    expect(pending.then).to.have.been.calledOnce
    expect(pending.then.firstCall.args[1]).to.be.a('function')
  })
})

describe('SerialSyrup ordering', () => {
  it('should consume the first dependency synchronously', () => {
    const dep = { consume: sinon.spy(() => Promise.resolve(1)) }
    serial()
      .dependency(dep)
      .define(() => {})
      .consume()
    expect(dep.consume).to.have.been.calledOnce
  })

  it('should consume a dependency only once the previous one resolves', async () => {
    const first = Promise.withResolvers<number>()
    const dep1 = { consume: sinon.spy(() => first.promise) }
    const dep2 = { consume: sinon.spy(() => Promise.resolve(2)) }
    const body = sinon.spy()
    const value = serial()
      .dependency(dep1)
      .dependency(dep2)
      .define(body)
      .consume()
    await tick()
    expect(dep1.consume).to.have.been.calledOnce
    expect(dep2.consume).to.not.have.been.called
    first.resolve(1)
    await value
    expect(dep2.consume).to.have.been.calledAfter(dep1.consume)
    expect(body).to.have.been.calledWith({}, 1, 2)
  })

  it('should stop at the first dependency that rejects', async () => {
    const dep1 = { consume: () => Promise.reject(new Error('dep1')) }
    const dep2 = { consume: sinon.spy(() => Promise.resolve(2)) }
    const body = sinon.spy()
    const value = serial()
      .dependency(dep1)
      .dependency(dep2)
      .define(body)
      .consume()
    expect(await rejection(value)).to.have.property('message', 'dep1')
    expect(dep2.consume).to.not.have.been.called
    expect(body).to.not.have.been.called
  })

  it('should pick up a dependency added while consuming', async () => {
    const first = Promise.withResolvers<number>()
    const late = { consume: sinon.spy(() => Promise.resolve('late')) }
    const body = sinon.spy()
    const main = serial()
      .dependency({ consume: () => first.promise })
      .define(body)
    const value = main.consume()
    main.dependency(late)
    first.resolve(1)
    await value
    expect(body).to.have.been.calledWith({}, 1, 'late')
  })
})
