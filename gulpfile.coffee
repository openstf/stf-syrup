gulp = require 'gulp'
clean = require 'gulp-clean'
coffee = require 'gulp-coffee'
mocha = require 'gulp-mocha'

gulp.task 'clean', ->
  gulp.src ['lib', 'index.js'], read: false
    .pipe clean()

gulp.task 'lib', ->
  gulp.src 'src/**/*.coffee'
    .pipe coffee()
    .pipe gulp.dest 'lib'

gulp.task 'index', ->
  gulp.src 'index.coffee'
    .pipe coffee()
    .pipe gulp.dest '.'

gulp.task 'compile', ['lib', 'index']

gulp.task 'test', ->
  gulp.src 'test/**/*.coffee', read: false
    .pipe mocha
      reporter: 'spec'

gulp.task 'prepublish', ['test', 'compile']
gulp.task 'postpublish', ['clean']
gulp.task 'default', ['test']
