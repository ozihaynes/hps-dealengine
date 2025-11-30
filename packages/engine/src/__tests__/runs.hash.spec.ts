import { describe, expect, it } from 'vitest';
import { canonicalJson, hashJson } from '@hps-internal/contracts';

describe('runs hashing contract', () => {
  it('canonicalJson produces the same string for objects with different key order', () => {
    const a = { b: 1, a: 2, nested: { y: 1, x: 2 } };
    const b = { nested: { x: 2, y: 1 }, a: 2, b: 1 };

    const jsonA = canonicalJson(a);
    const jsonB = canonicalJson(b);

    expect(jsonA).toBe(jsonB);
  });

  it('hashJson is stable for equivalent objects', () => {
    const a = { b: 1, a: 2, nested: { y: 1, x: 2 } };
    const b = { nested: { x: 2, y: 1 }, a: 2, b: 1 };

    const hashA = hashJson(a);
    const hashB = hashJson(b);

    expect(hashA).toEqual(hashB);
  });

  it('hashJson differs for different logical values', () => {
    const value1 = { key: 'value', amount: 100 };
    const value2 = { key: 'value', amount: 200 };

    const hash1 = hashJson(value1);
    const hash2 = hashJson(value2);

    expect(hash1).not.toBe(hash2);
  });
});
