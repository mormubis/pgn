import * as fs from 'node:fs';

import lexer from './src/lexer.ts';

const input = fs.readFileSync('./test.pgn', 'utf8');

console.log('>>>'.repeat(80 / 3));
console.log(input);
console.log('>>>'.repeat(80 / 3));

lexer.reset(input);

let lastLine = 1;
let result: any[][] = [[]];
let token;
while ((token = lexer.next())) {
  if (token.line !== lastLine) {
    result.push([]);
    lastLine = token.line;
  }

  let scope = result[result.length - 1];

  scope?.push(token);
}

console.log(
  result
    .map((line) =>
      line
        .filter((token) => token.type !== '__')
        .map(
          (token) =>
            `${token.type.toUpperCase()}(${JSON.stringify(token.value)})`,
        )
        .join(' '),
    )
    .join('\n'),
);

console.log('>>>'.repeat(80 / 3));
