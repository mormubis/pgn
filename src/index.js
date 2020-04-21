const { Grammar, Parser } = require('nearley');

const grammar = require('./grammar');

module.exports = function parse(string) {
  const parser = new Parser(Grammar.fromCompiled(grammar));

  string = string.replace(/\r/g, '');

  parser.feed(string);

  return parser.results[0];
};
