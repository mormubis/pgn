const { Grammar, Parser } = require('nearley');

const grammar = require('./grammar');

function parse(input) {
  const parser = new Parser(Grammar.fromCompiled(grammar));

  parser.feed(input);

  return parser.results[0];
}

module.exports = function parseAll(string) {
  const games = string
    .replace(/\r/g, '')
    .replace(/([012*])(\s\n)+(\[)/g, '$1\n\n=====\n\n$3')
    .split('\n\n=====\n\n');

  return games.map(parse).filter(Boolean).flat();
};
