Promise = require 'bluebird'

ParallelSyrup = require './parallel'

class SerialSyrup extends ParallelSyrup.Syrup
  consume: (overrides) ->
    if @resolved
      @resolved
    else
      consumeSerial = =>
        cursor = 0
        results = []
        next = =>
          if cursor < @dependencies.length
            @dependencies[cursor++].consume overrides
              .then (value) ->
                results.push value
                next()
          else
            Promise.resolve results
        next()

      @resolved = consumeSerial()
        .then (results) =>
          results.unshift overrides
          this.invoke.apply this, results

module.exports = (options) ->
  new SerialSyrup options

module.exports.Syrup = SerialSyrup
