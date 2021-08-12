import { DomRange, DomRangePoint } from '../../src';

describe('DomRange Tests', () => {
  it('parse {DomRange} minimal JSON', () => {
    expect(
      DomRange.deserialize({
        start: {
          cssSelector: 'p',
          textNodeIndex: 4,
        },
      })
    ).toEqual(
      new DomRange({
        start: new DomRangePoint({ cssSelector: 'p', textNodeIndex: 4 }),
      })
    );
  });

  it('parse {DomRange} full JSON', () => {
    expect(
      DomRange.deserialize({
        start: {
          cssSelector: 'p',
          textNodeIndex: 4,
        },
        end: {
          cssSelector: 'a',
          textNodeIndex: 2,
        },
      })
    ).toEqual(
      new DomRange({
        start: new DomRangePoint({ cssSelector: 'p', textNodeIndex: 4 }),
        end: new DomRangePoint({ cssSelector: 'a', textNodeIndex: 2 }),
      })
    );
  });

  it('parse {DomRange} invalid JSON', () => {
    expect(DomRange.deserialize({ invalid: 'object' })).toBeUndefined();
  });

  it('parse {DomRange} undefined JSON', () => {
    expect(DomRange.deserialize(undefined)).toBeUndefined();
  });

  it('get {DomRange} minimal JSON', () => {
    expect(
      new DomRange({
        start: new DomRangePoint({ cssSelector: 'p', textNodeIndex: 4 }),
      }).serialize()
    ).toEqual({
      start: {
        cssSelector: 'p',
        textNodeIndex: 4,
      },
    });
  });

  it('get {DomRange} full JSON', () => {
    expect(
      new DomRange({
        start: new DomRangePoint({ cssSelector: 'p', textNodeIndex: 4 }),
        end: new DomRangePoint({ cssSelector: 'a', textNodeIndex: 2 }),
      }).serialize()
    ).toEqual({
      start: {
        cssSelector: 'p',
        textNodeIndex: 4,
      },
      end: {
        cssSelector: 'a',
        textNodeIndex: 2,
      },
    });
  });

  it('parse {DomRangePoint} minimal JSON', () => {
    expect(
      DomRangePoint.deserialize({
        cssSelector: 'p',
        textNodeIndex: 4,
      })
    ).toEqual(
      new DomRangePoint({
        cssSelector: 'p',
        textNodeIndex: 4,
      })
    );
  });

  it('parse {DomRangePoint} full JSON', () => {
    expect(
      DomRangePoint.deserialize({
        cssSelector: 'p',
        textNodeIndex: 4,
        charOffset: 32,
      })
    ).toEqual(
      new DomRangePoint({
        cssSelector: 'p',
        textNodeIndex: 4,
        charOffset: 32,
      })
    );
  });

  it('parse {DomRangePoint} invalid JSON', () => {
    expect(DomRangePoint.deserialize({ cssSelector: 'p' })).toBeUndefined();
  });

  it('parse {DomRangePoint} undefined JSON', () => {
    expect(DomRangePoint.deserialize(undefined)).toBeUndefined();
  });

  it('parse {DomRangePoint} requires positive {textNodeIndex}', () => {
    expect(
      DomRangePoint.deserialize({
        cssSelector: 'p',
        textNodeIndex: 1,
      })
    ).toEqual(
      new DomRangePoint({
        cssSelector: 'p',
        textNodeIndex: 1,
      })
    );

    expect(
      DomRangePoint.deserialize({
        cssSelector: 'p',
        textNodeIndex: 0,
      })
    ).toEqual(
      new DomRangePoint({
        cssSelector: 'p',
        textNodeIndex: 0,
      })
    );

    expect(
      DomRangePoint.deserialize({
        cssSelector: 'p',
        textNodeIndex: -1,
      })
    ).toBeUndefined();
  });

  it('parse {Point} requires positive {charOffset}', () => {
    expect(
      DomRangePoint.deserialize({
        cssSelector: 'p',
        textNodeIndex: 1,
        charOffset: 1,
      })
    ).toEqual(
      new DomRangePoint({
        cssSelector: 'p',
        textNodeIndex: 1,
        charOffset: 1,
      })
    );

    expect(
      DomRangePoint.deserialize({
        cssSelector: 'p',
        textNodeIndex: 1,
        charOffset: 0,
      })
    ).toEqual(
      new DomRangePoint({
        cssSelector: 'p',
        textNodeIndex: 1,
        charOffset: 0,
      })
    );

    expect(
      DomRangePoint.deserialize({
        cssSelector: 'p',
        textNodeIndex: 1,
        charOffset: -1,
      })
    ).toEqual(
      new DomRangePoint({
        cssSelector: 'p',
        textNodeIndex: 1,
      })
    );
  });

  it('get {DomRangePoint} minimal JSON', () => {
    expect(
      new DomRangePoint({ cssSelector: 'p', textNodeIndex: 4 }).serialize()
    ).toEqual({
      cssSelector: 'p',
      textNodeIndex: 4,
    });
  });

  it('get {DomRangePoint} full JSON', () => {
    expect(
      new DomRangePoint({
        cssSelector: 'p',
        textNodeIndex: 4,
        charOffset: 32,
      }).serialize()
    ).toEqual({
      cssSelector: 'p',
      textNodeIndex: 4,
      charOffset: 32,
    });
  });
});
