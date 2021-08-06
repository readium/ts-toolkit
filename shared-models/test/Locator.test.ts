import { Link, LocatorLocations, Locator, LocatorText } from '../src';

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
        locations: new LocatorLocations({ position: 42 }),
        text: new LocatorText({ highlight: 'Excerpt' }),
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
    expect(new Link({ href: 'http://locator' }).locator).toEqual(
      new Locator({ href: 'http://locator', type: '' })
    );
  });

  it('create {Locator} from full {Link} with fragment', () => {
    expect(
      new Link({
        href: 'http://locator#page=42',
        type: 'text/html',
        title: 'My Link',
      }).locator
    ).toEqual(
      new Locator({
        href: 'http://locator',
        type: 'text/html',
        title: 'My Link',
        locations: new LocatorLocations({ fragments: ['page=42'] }),
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
        locations: new LocatorLocations({ position: 42 }),
        text: new LocatorText({ highlight: 'Excerpt' }),
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
        locations: new LocatorLocations({
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
        locations: new LocatorLocations({
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
        locations: new LocatorLocations({
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
        locations: new LocatorLocations({}),
      })
    );
  });

  it('parse {Locations} minimal JSON', () => {
    expect(LocatorLocations.deserialize({})).toEqual(new LocatorLocations({}));
  });

  it('parse {Locations} full JSON', () => {
    expect(
      LocatorLocations.deserialize({
        fragments: ['p=4', 'frag34'],
        progression: 0.74,
        totalProgression: 0.32,
        position: 42,
        other: 'other-location',
      })
    ).toEqual(
      new LocatorLocations({
        fragments: ['p=4', 'frag34'],
        progression: 0.74,
        position: 42,
        totalProgression: 0.32,
        otherLocations: new Map([['other', 'other-location']]),
      })
    );
  });

  it('parse {Locations} undefined JSON', () => {
    expect(LocatorLocations.deserialize(undefined)).toBeUndefined();
  });

  it('parse {Locations} single fragment JSON', () => {
    expect(LocatorLocations.deserialize({ fragment: 'frag34' })).toEqual(
      new LocatorLocations({ fragments: ['frag34'] })
    );
  });

  it('parse {Locations} ignores {position} smaller than 1', () => {
    expect(LocatorLocations.deserialize({ position: 1 })).toEqual(
      new LocatorLocations({ position: 1 })
    );
    expect(LocatorLocations.deserialize({ position: 0 })).toEqual(
      new LocatorLocations({})
    );
    expect(LocatorLocations.deserialize({ position: -1 })).toEqual(
      new LocatorLocations({})
    );
  });

  it('parse {Locations} ignores {progression} outside of 0-1 range', () => {
    expect(LocatorLocations.deserialize({ progression: 0.5 })).toEqual(
      new LocatorLocations({ progression: 0.5 })
    );
    expect(LocatorLocations.deserialize({ progression: 0 })).toEqual(
      new LocatorLocations({ progression: 0 })
    );
    expect(LocatorLocations.deserialize({ progression: 1 })).toEqual(
      new LocatorLocations({ progression: 1.0 })
    );
    expect(LocatorLocations.deserialize({ progression: -0.5 })).toEqual(
      new LocatorLocations({})
    );
    expect(LocatorLocations.deserialize({ progression: 1.2 })).toEqual(
      new LocatorLocations({})
    );
  });

  it('parse {Locations} ignores {totalProgression} outside of 0-1 range', () => {
    expect(LocatorLocations.deserialize({ totalProgression: 0.5 })).toEqual(
      new LocatorLocations({ totalProgression: 0.5 })
    );
    expect(LocatorLocations.deserialize({ totalProgression: 0 })).toEqual(
      new LocatorLocations({ totalProgression: 0 })
    );
    expect(LocatorLocations.deserialize({ totalProgression: 1 })).toEqual(
      new LocatorLocations({ totalProgression: 1.0 })
    );
    expect(LocatorLocations.deserialize({ totalProgression: -0.5 })).toEqual(
      new LocatorLocations({})
    );
    expect(LocatorLocations.deserialize({ totalProgression: 1.2 })).toEqual(
      new LocatorLocations({})
    );
  });

  it('get {Locations} minimal JSON', () => {
    expect(new LocatorLocations({}).serialize()).toEqual(
      new LocatorLocations({})
    );
  });

  it('get {Locations} full JSON', () => {
    expect(
      new LocatorLocations({
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
    expect(LocatorText.deserialize({})).toEqual(new LocatorText({}));
  });

  it('parse {Text} full JSON', () => {
    expect(
      LocatorText.deserialize({
        before: 'Text before',
        highlight: 'Highlighted text',
        after: 'Text after',
      })
    ).toEqual(
      new LocatorText({
        before: 'Text before',
        highlight: 'Highlighted text',
        after: 'Text after',
      })
    );
  });

  it('parse {Text} undefined JSON', () => {
    expect(LocatorText.deserialize(undefined)).toBeUndefined();
  });

  it('get {Text} minimal JSON', () => {
    expect(new LocatorText({}).serialize()).toEqual(new LocatorText({}));
  });

  it('get {Text} full JSON', () => {
    expect(
      new LocatorText({
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
