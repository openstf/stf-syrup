Assert = require 'assert'

Promise = require 'bluebird'
_ = require 'lodash'

class ParallelSyrup
  constructor: (@options = {}) ->
    @body = null
    @dependencies = []
    @resolved = null

  define: (@body) ->
    this

  dependency: (dep) ->
    Assert dep, "Dependency is undefined; perhaps the module is missing
      module.exports?"
    Assert dep.consume, "Dependency is missing `.consume()` method. Perhaps
      it's not a Syrup module?"
    @dependencies.push dep
    this

  consume: (overrides) ->
    if @resolved
      @resolved
    else
      @resolved = Promise.all @dependencies.map (dep) -> dep.consume overrides
        .then (results) =>
          results.unshift overrides
          this.invoke.apply this, results

  invoke: (overrides = {}, args...) ->
    Assert @body, "Unable to `.invoke()` before setting body via `.define()`"
    args.unshift _.defaults overrides, @options
    @body.apply null, args

module.exports = (options) ->
  new ParallelSyrup options

module.exports.Syrup = ParallelSyrup
