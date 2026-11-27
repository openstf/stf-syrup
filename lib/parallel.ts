import assert = require('assert')

/**
 * The function a Syrup module is defined with. It receives the options
 * followed by the resolved value of every dependency, in the order the
 * dependencies were added.
 *
 * The parameters are typed as `never` so that a body with any parameter types
 * can be assigned to it.
 */
type BodyFn<R> = (options: never, ...dependencies: never[]) => R

/**
 * Anything that can be added with `.dependency()`. Usually another Syrup.
 */
interface DependencyLike {
  consume(overrides?: object): PromiseLike<unknown>
}

// Same semantics as lodash's `_.defaults(object, source)`, which this package
// used to depend on: copies every enumerable own or inherited property of
// `source` into `object` unless `object` already has a value other than
// `undefined` for it, and returns `object` itself, mutated.
function defaults(object: unknown, source: object): object {
  const target: Record<string, unknown> = Object(object)
  const proto = Object.prototype as unknown as Record<string, unknown>
  const from = source as Record<string, unknown>
  for (const key in from) {
    const value = target[key]
    if (
      value === undefined ||
      (sameValueZero(value, proto[key]) &&
        !Object.prototype.hasOwnProperty.call(target, key))
    ) {
      target[key] = from[key]
    }
  }
  return target
}

function sameValueZero(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b)
}

/**
 * A module whose dependencies are consumed in parallel.
 *
 * `T` is the value `consume()` resolves to, i.e. the awaited return value of
 * the body. `B` is the body's raw return value, which `invoke()` returns.
 */
class ParallelSyrup<T = unknown, B = unknown> implements DependencyLike {
  public options: object
  public body: BodyFn<B> | null
  public dependencies: DependencyLike[]
  public resolved: Promise<T> | null

  constructor(options?: object | null) {
    this.options = options ?? {}
    this.body = null
    this.dependencies = []
    this.resolved = null
  }

  /**
   * Sets the body of the module and returns the same instance, typed after
   * the body's return value.
   */
  define<R>(body: BodyFn<R>): ParallelSyrup<Awaited<R>, R> {
    const self = this as unknown as ParallelSyrup<Awaited<R>, R>
    self.body = body
    return self
  }

  /**
   * Adds a dependency. Its resolved value is passed to the body after the
   * options and the values of the dependencies added before it.
   */
  dependency(dep: DependencyLike): this {
    assert(
      dep,
      'Dependency is undefined; perhaps the module is missing module.exports?'
    )
    assert(
      dep.consume,
      "Dependency is missing `.consume()` method. Perhaps it's not a Syrup module?"
    )
    this.dependencies.push(dep)
    return this
  }

  /**
   * Consumes every dependency, then invokes the body with the results. The
   * first call does the work; every later call returns the same promise,
   * whatever overrides it is given.
   */
  consume(overrides?: object): Promise<T> {
    if (this.resolved) {
      return this.resolved
    }
    // Every dependency's consume() is called synchronously here, so a
    // dependency that throws makes consume() throw rather than reject. The
    // promises the earlier ones already returned would then reach nobody, so
    // they get a handler to keep a rejection among them from crashing Node.js.
    const pending: PromiseLike<unknown>[] = []
    try {
      for (const dep of this.dependencies) {
        pending.push(dep.consume(overrides))
      }
    } catch (error) {
      for (const promise of pending) {
        promise.then(undefined, () => {})
      }
      throw error
    }
    this.resolved = Promise.all(pending).then(
      results => this.invoke(overrides, ...results) as unknown as T
    )
    return this.resolved
  }

  /**
   * Calls the body directly with the given dependencies, without consuming
   * any of the real ones. The overrides are filled in with the default
   * options, mutating the given object.
   */
  invoke(overrides?: object | null, ...dependencies: unknown[]): B {
    assert(
      this.body,
      'Unable to `.invoke()` before setting body via `.define()`'
    )
    const body = this.body as (...args: unknown[]) => B
    return body.apply(null, [
      defaults(overrides ?? {}, this.options),
      ...dependencies
    ])
  }
}

/**
 * Creates a module whose dependencies are consumed in parallel.
 */
function syrup(options?: object | null): ParallelSyrup {
  return new ParallelSyrup(options)
}

// A namespace is the only way to give an `export =` function type members,
// which consumers use as `syrup.Syrup<T>`.
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace syrup {
  export const Syrup = ParallelSyrup
  export type Syrup<T = unknown, B = unknown> = ParallelSyrup<T, B>
  export type Body<R> = BodyFn<R>
  export type Dependency = DependencyLike
}

export = syrup
