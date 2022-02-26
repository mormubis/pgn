const fs = require('fs');

function readFile(path) {
  const filename = require.resolve(path);

  return fs.readFileSync(filename, 'utf8');
}

const parse = require('../src/index');

const basic = readFile('./grammar/basic.pgn');
const checkmate = readFile('./grammar/checkmate.pgn');
const comment = readFile('./grammar/comment.pgn');
const comments = readFile('./grammar/comments.pgn');
const multiple = readFile('./grammar/multiple-game.pgn');
const promotion = readFile('./grammar/promotion.pgn');
const variants = readFile('./grammar/variants.pgn');
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

  it('comments', () => {
    expect(parse(comments)).toMatchSnapshot();
  });

  it('multiple', () => {
    expect(parse(multiple)).toMatchSnapshot();
  });

  it('promotion', () => {
    expect(parse(promotion)).toMatchSnapshot();
  });

  it('variants', () => {
    expect(parse(variants)).toMatchSnapshot();
  });

  it('long', () => {
    expect(parse(long)).toMatchSnapshot();
  });
});
