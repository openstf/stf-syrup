Assert = require 'assert'
Promise = require 'bluebird'

class Syrup
  constructor: ->
    @body = null
    @drops = []
    @resolved = null

  define: (@body) ->
    this

  dependency: (drop) ->
    Assert drop, "Dependency is undefined; perhaps the module is missing
      module.exports?"
    Assert drop.consume, "Dependency is missing `.consume()` method. Perhaps
      it's not a Syrup module?"
    @drops.push drop
    this

  consume: ->
    if @resolved
      @resolved
    else
      @resolved = Promise.all @drops.map (drop) -> drop.consume()
        .then (results) =>
          this.invoke.apply this, results

  invoke: ->
    Assert @body, "Unable to `.invoke()` before setting body via `.define()`"
    @body.apply null, arguments

module.exports = ->
  new Syrup

module.exports.Syrup = Syrup
