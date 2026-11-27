import parallel = require('./parallel')
import serial = require('./serial')

// Attaches the serial factory to the parallel one itself rather than to a
// copy, as the CoffeeScript version did, so the package exports the very
// function lib/parallel does. Only this module's type has .serial, since
// lib/parallel loaded on its own does not.
const syrup: typeof parallel & { serial: typeof serial } = Object.assign(
  parallel,
  { serial }
)

// Keeps the type members of lib/parallel, such as `syrup.Syrup<T>`, which a
// const alone would not carry.
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace syrup {
  export type Syrup<T = unknown, B = unknown> = parallel.Syrup<T, B>
  export type Body<R> = parallel.Body<R>
  export type Dependency = parallel.Dependency
}

export = syrup
