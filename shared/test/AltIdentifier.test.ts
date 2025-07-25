import { AltIdentifier } from '../src';

describe('AltIdentifier', () => {
  it('parse JSON string', () => {
    const identifier = AltIdentifier.deserialize('author:67890');
    expect(identifier).toBeDefined();
    expect(identifier?.value).toBe('author:67890');
    expect(identifier?.scheme).toBeUndefined();
  });

  it('parse JSON object', () => {
    const identifier = AltIdentifier.deserialize({
      value: 'author:67890',
      scheme: 'http://example.com/schemes/author-id'
    });

    expect(identifier).toBeDefined();
    expect(identifier?.value).toBe('author:67890');
    expect(identifier?.scheme).toBe('http://example.com/schemes/author-id');
  });

  it('parse JSON object without scheme', () => {
    const identifier = AltIdentifier.deserialize({
      value: 'author:67890'
    });

    expect(identifier).toBeDefined();
    expect(identifier?.value).toBe('author:67890');
    expect(identifier?.scheme).toBeUndefined();
  });

  it('parse JSON invalid', () => {
    const identifier = AltIdentifier.deserialize({
      scheme: 'http://example.com/schemes/author-id'
    });

    expect(identifier).toBeUndefined();
  });

  it('serialize string', () => {
    const identifier = new AltIdentifier({
      value: 'author:22222'
    });

    const json = identifier.serialize();
    expect(json).toBe('author:22222');
  });

  it('serialize object', () => {
    const identifier = new AltIdentifier({
      value: 'author:22222',
      scheme: 'http://example.com/schemes/author-id'
    });

    const json = identifier.serialize();
    expect(json).toEqual({
      value: 'author:22222',
      scheme: 'http://example.com/schemes/author-id'
    });
  });
});
