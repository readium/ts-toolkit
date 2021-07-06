import { Link, Locations, Locator, Text } from '../src';

describe('Locator Tests', () => {
  it('parse {Locator} minimal JSON', () => {
    expect(
      Locator.deserialize({
        href: 'http://locator',
        type: 'text/html',
      })
    ).toEqual(new Locator({ href: 'http://locator', type: 'text/html' }));
  });

  it('parse {Locator} full JSON', () => {
    expect(
      Locator.deserialize({
        href: 'http://locator',
        type: 'text/html',
        title: 'My Locator',
        locations: {
          position: 42,
        },
        text: {
          highlight: 'Excerpt',
        },
      })
    ).toEqual(
      new Locator({
        href: 'http://locator',
        type: 'text/html',
        title: 'My Locator',
        locations: new Locations({ position: 42 }),
        text: new Text({ highlight: 'Excerpt' }),
      })
    );
  });

  it('parse {Locator} undefined JSON', () => {
    expect(Locator.deserialize(undefined)).toBeUndefined();
  });

  it('parse {Locator} invalid JSON', () => {
    expect(Locator.deserialize({ invalid: 'object' })).toBeUndefined();
  });

  it('create {Locator} from minimal {Link}', () => {
    expect(new Link({ href: 'http://locator' }).toLocator()).toEqual(
      new Locator({ href: 'http://locator', type: '' })
    );
  });

  it('create {Locator} from full {Link} with fragment', () => {
    expect(
      new Link({
        href: 'http://locator#page=42',
        type: 'text/html',
        title: 'My Link',
      }).toLocator()
    ).toEqual(
      new Locator({
        href: 'http://locator',
        type: 'text/html',
        title: 'My Link',
        locations: new Locations({ fragments: ['page=42'] }),
      })
    );
  });

  it('get {Locator} minimal JSON', () => {
    expect(
      new Locator({ href: 'http://locator', type: 'text/html' }).serialize()
    ).toEqual(
      Locator.deserialize({
        href: 'http://locator',
        type: 'text/html',
      })
    );
  });

  it('get {Locator} full JSON', () => {
    expect(
      new Locator({
        href: 'http://locator',
        type: 'text/html',
        title: 'My Locator',
        locations: new Locations({ position: 42 }),
        text: new Text({ highlight: 'Excerpt' }),
      }).serialize()
    ).toEqual(
      Locator.deserialize({
        href: 'http://locator',
        type: 'text/html',
        title: 'My Locator',
        locations: {
          position: 42,
        },
        text: {
          highlight: 'Excerpt',
        },
      })
    );
  });

  it('copy a {Locator} with different {Locations} sub-properties', () => {
    expect(
      new Locator({
        href: 'http://locator',
        type: 'text/html',
        locations: new Locations({
          progression: 2.0,
          position: 42,
        }),
      }).copyWithLocations({
        fragments: ['p=4', 'frag34'],
        progression: 0.74,
        position: 42,
        totalProgression: 0.32,
        otherLocations: new Map([['other', 'other-location']]),
      })
    ).toEqual(
      new Locator({
        href: 'http://locator',
        type: 'text/html',
        locations: new Locations({
          fragments: ['p=4', 'frag34'],
          progression: 0.74,
          position: 42,
          totalProgression: 0.32,
          otherLocations: new Map([['other', 'other-location']]),
        }),
      })
    );
  });

  it('copy a {Locator} with reset {Locations} sub-properties', () => {
    expect(
      new Locator({
        href: 'http://locator',
        type: 'text/html',
        locations: new Locations({
          progression: 2.0,
          position: 42,
        }),
      }).copyWithLocations({
        fragments: [],
        progression: undefined,
        position: undefined,
        totalProgression: undefined,
        otherLocations: undefined,
      })
    ).toEqual(
      new Locator({
        href: 'http://locator',
        type: 'text/html',
        locations: new Locations({}),
      })
    );
  });

  it('parse {Locations} minimal JSON', () => {
    expect(Locations.deserialize({})).toEqual(new Locations({}));
  });

  it('parse {Locations} full JSON', () => {
    expect(
      Locations.deserialize({
        fragments: ['p=4', 'frag34'],
        progression: 0.74,
        totalProgression: 0.32,
        position: 42,
        other: 'other-location',
      })
    ).toEqual(
      new Locations({
        fragments: ['p=4', 'frag34'],
        progression: 0.74,
        position: 42,
        totalProgression: 0.32,
        otherLocations: new Map([['other', 'other-location']]),
      })
    );
  });

  it('parse {Locations} undefined JSON', () => {
    expect(Locations.deserialize(undefined)).toBeUndefined();
  });

  it('parse {Locations} single fragment JSON', () => {
    expect(Locations.deserialize({ fragment: 'frag34' })).toEqual(
      new Locations({ fragments: ['frag34'] })
    );
  });

  it('parse {Locations} ignores {position} smaller than 1', () => {
    expect(Locations.deserialize({ position: 1 })).toEqual(
      new Locations({ position: 1 })
    );
    expect(Locations.deserialize({ position: 0 })).toEqual(new Locations({}));
    expect(Locations.deserialize({ position: -1 })).toEqual(new Locations({}));
  });

  it('parse {Locations} ignores {progression} outside of 0-1 range', () => {
    expect(Locations.deserialize({ progression: 0.5 })).toEqual(
      new Locations({ progression: 0.5 })
    );
    expect(Locations.deserialize({ progression: 0 })).toEqual(
      new Locations({ progression: 0 })
    );
    expect(Locations.deserialize({ progression: 1 })).toEqual(
      new Locations({ progression: 1.0 })
    );
    expect(Locations.deserialize({ progression: -0.5 })).toEqual(
      new Locations({})
    );
    expect(Locations.deserialize({ progression: 1.2 })).toEqual(
      new Locations({})
    );
  });

  it('parse {Locations} ignores {totalProgression} outside of 0-1 range', () => {
    expect(Locations.deserialize({ totalProgression: 0.5 })).toEqual(
      new Locations({ totalProgression: 0.5 })
    );
    expect(Locations.deserialize({ totalProgression: 0 })).toEqual(
      new Locations({ totalProgression: 0 })
    );
    expect(Locations.deserialize({ totalProgression: 1 })).toEqual(
      new Locations({ totalProgression: 1.0 })
    );
    expect(Locations.deserialize({ totalProgression: -0.5 })).toEqual(
      new Locations({})
    );
    expect(Locations.deserialize({ totalProgression: 1.2 })).toEqual(
      new Locations({})
    );
  });

  it('get {Locations} minimal JSON', () => {
    expect(new Locations({}).serialize()).toEqual(new Locations({}));
  });

  it('get {Locations} full JSON', () => {
    expect(
      new Locations({
        fragments: ['p=4', 'frag34'],
        progression: 0.74,
        position: 42,
        totalProgression: 25.32,
        otherLocations: new Map([['other', 'other-location']]),
      }).serialize()
    ).toEqual({
      fragments: ['p=4', 'frag34'],
      progression: 0.74,
      totalProgression: 25.32,
      position: 42,
      other: 'other-location',
    });
  });

  it('parse {Text} minimal JSON', () => {
    expect(Text.deserialize({})).toEqual(new Text({}));
  });

  it('parse {Text} full JSON', () => {
    expect(
      Text.deserialize({
        before: 'Text before',
        highlight: 'Highlighted text',
        after: 'Text after',
      })
    ).toEqual(
      new Text({
        before: 'Text before',
        highlight: 'Highlighted text',
        after: 'Text after',
      })
    );
  });

  it('parse {Text} undefined JSON', () => {
    expect(Text.deserialize(undefined)).toBeUndefined();
  });

  it('get {Text} minimal JSON', () => {
    expect(new Text({}).serialize()).toEqual(new Text({}));
  });

  it('get {Text} full JSON', () => {
    expect(
      new Text({
        before: 'Text before',
        highlight: 'Highlighted text',
        after: 'Text after',
      }).serialize()
    ).toEqual({
      before: 'Text before',
      highlight: 'Highlighted text',
      after: 'Text after',
    });
  });
});
