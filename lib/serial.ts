import parallel = require('./parallel')

/**
 * A module whose dependencies are consumed one after another, in the order
 * they were added. Each one is consumed only once the previous one resolves.
 */
class SerialSyrup<T = unknown, B = unknown> extends parallel.Syrup<T, B> {
  // Only narrows the return type, so that a defined module is still typed as
  // a SerialSyrup.
  override define<R>(body: parallel.Body<R>): SerialSyrup<Awaited<R>, R> {
    return super.define(body) as SerialSyrup<Awaited<R>, R>
  }

  override consume(overrides?: object): Promise<T> {
    if (this.resolved) {
      return this.resolved
    }
    // The first dependency is consumed synchronously, like the original
    // implementation, so one that throws makes consume() throw rather than
    // reject. The length is read again on every step.
    const first = this.dependencies[0]?.consume(overrides)
    this.resolved = this.consumeRest(first, overrides).then(
      results => this.invoke(overrides, ...results) as unknown as T
    )
    return this.resolved
  }

  private async consumeRest(
    first: PromiseLike<unknown> | undefined,
    overrides?: object
  ): Promise<unknown[]> {
    const results: unknown[] = []
    if (!first) {
      return results
    }
    results.push(await first)
    for (let i = 1; i < this.dependencies.length; i++) {
      results.push(await this.dependencies[i]!.consume(overrides))
    }
    return results
  }
}

/**
 * Creates a module whose dependencies are consumed serially.
 */
function serial(options?: object | null): SerialSyrup {
  return new SerialSyrup(options)
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace serial {
  export const Syrup = SerialSyrup
  export type Syrup<T = unknown, B = unknown> = SerialSyrup<T, B>
}

export = serial
