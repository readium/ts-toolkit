import { DomRange, DomRangePoint, LocatorLocations } from '../../src';

describe('Locator Html Extension Tests', () => {
  it('get Locations {cssSelector} when available', () => {
    expect(
      new LocatorLocations({
        otherLocations: new Map([['cssSelector', 'p']]),
      }).getCssSelector()
    ).toEqual('p');
  });

  it('get Locations {cssSelector} when missing', () => {
    expect(new LocatorLocations({}).getCssSelector()).toBeUndefined();
  });

  it('get Locations {partialCfi} when available', () => {
    expect(
      new LocatorLocations({
        otherLocations: new Map([['partialCfi', 'epubcfi(/4)']]),
      }).getPartialCfi()
    ).toEqual('epubcfi(/4)');
  });

  it('get Locations {partialCfi} when missing', () => {
    expect(new LocatorLocations({}).getPartialCfi()).toBeUndefined();
  });

  it('get Locations {domRange} when available', () => {
    expect(
      new LocatorLocations({
        otherLocations: new Map<string, any>([
          ['domRange', { start: { cssSelector: 'p', textNodeIndex: 4 } }],
        ]),
      }).getDomRange()
    ).toEqual(
      new DomRange({
        start: new DomRangePoint({ cssSelector: 'p', textNodeIndex: 4 }),
      })
    );
  });

  it('get Locations {domRange} when missing', () => {
    expect(new LocatorLocations({}).getDomRange()).toBeUndefined();
  });
});
