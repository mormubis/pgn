import { describe, expect, it } from 'vitest';

import { stream } from '../index.js';

async function* chunksOf(s: string, size: number): AsyncGenerator<string> {
  for (let index = 0; index < s.length; index += size) {
    yield s.slice(index, index + size);
  }
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of gen) {
    results.push(item);
  }
  return results;
}

const singleGame = `[Event "Test"]
[White "A"]
[Black "B"]
[Result "1-0"]

1. e4 e5 2. Nf3 1-0`;

async function* emptyGenerator(): AsyncGenerator<string> {
  yield* [];
}

async function* fromArray(array: string[]): AsyncGenerator<string> {
  for (const chunk of array) {
    yield chunk;
  }
}

const twoGames = `[Event "Game 1"]
[Result "1-0"]

1. e4 1-0

[Event "Game 2"]
[Result "0-1"]

1. d4 0-1`;

describe('stream()', () => {
  it('yields one game from a single-game input', async () => {
    const games = await collect(stream(chunksOf(singleGame, 1024)));
    expect(games).toHaveLength(1);
    expect(games[0]?.meta['White']).toBe('A');
  });

  it('yields multiple games from a multi-game input', async () => {
    const games = await collect(stream(chunksOf(twoGames, 1024)));
    expect(games).toHaveLength(2);
    expect(games[0]?.meta['Event']).toBe('Game 1');
    expect(games[1]?.meta['Event']).toBe('Game 2');
  });

  it('handles chunks that split across game boundaries', async () => {
    // Use tiny chunk size to force splits at every possible boundary
    const games = await collect(stream(chunksOf(twoGames, 5)));
    expect(games).toHaveLength(2);
  });

  it('handles chunks that split a result token', async () => {
    // "1/2-1/2" can be split mid-token
    const draw = `[Event "Draw"]
[Result "1/2-1/2"]

1. e4 e5 1/2-1/2`;
    const games = await collect(stream(chunksOf(draw, 3)));
    expect(games).toHaveLength(1);
    expect(games[0]?.result).toBe(0.5);
  });

  it('skips result tokens inside comments', async () => {
    const withComment = `[Event "Test"]
[Result "1-0"]

1. e4 { This is 1-0 territory } e5 1-0`;
    const games = await collect(stream(chunksOf(withComment, 1024)));
    expect(games).toHaveLength(1);
  });

  it('yields nothing for empty input', async () => {
    const games = await collect(stream(emptyGenerator()));
    expect(games).toHaveLength(0);
  });

  it('accepts a Node.js-style ReadableStream of strings', async () => {
    // Simulate by passing an array wrapped in an async generator
    const games = await collect(stream(fromArray([singleGame])));
    expect(games).toHaveLength(1);
  });
});
