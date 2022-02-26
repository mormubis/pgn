const { Grammar, Parser } = require('nearley');

const grammar = require('./grammar');

function parse(input) {
  const parser = new Parser(Grammar.fromCompiled(grammar));

  parser.feed(input);

  return parser.results[0];
}

module.exports = function parseAll(string) {
  const games = string.replace(/[\r\uFEFF]/g, '');

  return parse(games);
};
