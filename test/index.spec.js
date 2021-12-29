const fs = require('fs');

function readFile(path) {
  const filename = require.resolve(path);

  return fs.readFileSync(filename, 'utf8');
}

const parse = require('../src/index');

const basic = readFile('./grammar/basic.pgn');
const checkmate = readFile('./grammar/checkmate.pgn');
const comment = readFile('./grammar/comment.pgn');
const multiple = readFile('./grammar/multiple-game.pgn');
const promotion = readFile('./grammar/promotion.pgn');
const variations = readFile('./grammar/variations.pgn');
const long = readFile('./grammar/long.pgn');

describe('PGN Parser', () => {
  it('basic', () => {
    expect(parse(basic)).toMatchSnapshot();
  });

  it('checkmate', () => {
    expect(parse(checkmate)).toMatchSnapshot();
  });

  it('comment', () => {
    expect(parse(comment)).toMatchSnapshot();
  });

  it('multiple', () => {
    expect(parse(multiple)).toMatchSnapshot();
  });

  it('promotion', () => {
    expect(parse(promotion)).toMatchSnapshot();
  });

  it('variations', () => {
    expect(parse(variations)).toMatchSnapshot();
  });

  it.only('long', () => {
    const response = parse(long);
    console.log(response);
  });
});
