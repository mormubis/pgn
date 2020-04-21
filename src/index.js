const { Grammar, Parser } = require('nearley');

const grammar = require('./grammar');

const parser = new Parser(Grammar.fromCompiled(grammar));

module.exports = function parse(string) {
  string = string.replace(/\r/g, '');

  parser.feed(string);

  return parser.results[0];
};
