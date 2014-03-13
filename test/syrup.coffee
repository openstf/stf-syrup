Promise = require 'bluebird'
chai = require 'chai'
sinon = require 'sinon'
chai.use require 'sinon-chai'
{expect} = chai

syrup = require '../src/syrup'

describe 'Syrup', ->

  it "should export the Syrup class via .Syrup property", ->
    expect(syrup.Syrup).to.be.a 'function'

  it "should export a function which returns a Syrup instance", ->
    expect(syrup()).to.be.an.instanceOf syrup.Syrup

  describe '.define()', ->

    it "should set the body", ->
      main = syrup()
      body = ->
      main.define body
      expect(main.body).to.equal body

    it "should return the Syrup instance", ->
      main = syrup()
      expect(main.define ->).to.equal main

  describe '.dependency()', ->

    it "should throw if dependency is undefined", ->
      main = syrup()
      expect(-> main.dependency undefined).to.throw

    it "should throw if dependency doesn't have consume method", ->
      main = syrup()
      fake = ->
      expect(-> main.dependency fake).to.throw

    it "should add Syrup dependency", ->
      main = syrup()
      dep = syrup()
      main.dependency dep
      expect(main.drops).to.eql [dep]

    it "should add unknown dependency with consume method", ->
      main = syrup()
      dep =
        consume: ->
      main.dependency dep
      expect(main.drops).to.eql [dep]

    it "should return the Syrup instance", ->
      main = syrup()
      expect(main.dependency syrup()).to.equal main

  describe '.invoke()', ->

    it "should invoke the body with given arguments", ->
      spy = sinon.spy()
      main = syrup()
      main.define spy
      main.invoke 1, 2, 3
      expect(spy).to.have.been.calledOnce
      expect(spy).to.have.been.calledWith 1, 2, 3

    it "should throw if body has not been set yet", ->
      main = syrup()
      expect(-> main.invoke()).to.throw

    it "should return body's return value", ->
      main = syrup()
      main.define ->
        7288
      expect(main.invoke()).to.equal 7288

  describe '.consume()', ->

    it "should return a Promise", ->
      main = syrup()
      main.define ->
      expect(main.consume()).to.be.an.instanceOf Promise

    it "should always return the same Promise", ->
      main = syrup()
      main.define ->
      expect(main.consume()).to.equal main.consume()

    it "should consume all dependencies", ->
      dep1 = syrup()
        .define ->
      dep2 = syrup()
        .define ->
      main = syrup()
        .dependency dep1
        .dependency dep2
        .define ->
      spy1 = sinon.spy dep1, 'consume'
      spy2 = sinon.spy dep2, 'consume'
      main.consume()
      expect(spy1).to.have.been.calledOnce
      expect(spy2).to.have.been.calledOnce

    it "should wait for body promise to resolve", (done) ->
      resolver = Promise.defer()
      main = syrup()
        .define ->
          resolver.promise
      value = main.consume()
      expect(value.isFulfilled()).to.be.false
      value.then ->
        expect(value.isFulfilled()).to.be.true
        done()
      resolver.resolve(1)

    it "should wait for dependencies to resolve", (done) ->
      resolver = Promise.defer()
      dep = syrup()
        .define ->
          resolver.promise
      main = syrup()
        .dependency dep
        .define ->
      value = main.consume()
      expect(value.isFulfilled()).to.be.false
      value.then ->
        expect(value.isFulfilled()).to.be.true
        done()
      resolver.resolve(1)

    it "should pass resolved values as arguments to body", (done) ->
      resolver1 = Promise.defer()
      dep1 = syrup()
        .define ->
          resolver1.promise
      resolver2 = Promise.defer()
      dep2 = syrup()
        .define ->
          resolver2.promise
      main = syrup()
        .dependency dep1
        .dependency dep2
        .define (val1, val2) ->
          expect(val1).to.equal 1
          expect(val2).to.equal 2
          done()
      value = main.consume()
      resolver1.resolve(1)
      resolver2.resolve(2)
