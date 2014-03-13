Path = require 'path'

module.exports = switch Path.extname __filename
  when '.coffee' then require './src/syrup'
  else require './lib/syrup'
