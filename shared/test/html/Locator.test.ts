import { DomRange, DomRangePoint, LocatorLocations, getCssSelector, getPartialCfi, getDomRange } from '../../src';

describe('Locator Html Extension Tests', () => {
  it('get Locations {cssSelector} when available', () => {
    expect(
      getCssSelector(new LocatorLocations({
        otherLocations: new Map([['cssSelector', 'p']]),
      }))
    ).toEqual('p');
  });

  it('get Locations {cssSelector} when missing', () => {
    expect(getCssSelector(new LocatorLocations({}))).toBeUndefined();
  });

  it('get Locations {partialCfi} when available', () => {
    expect(
      getPartialCfi(new LocatorLocations({
        otherLocations: new Map([['partialCfi', 'epubcfi(/4)']]),
      }))
    ).toEqual('epubcfi(/4)');
  });

  it('get Locations {partialCfi} when missing', () => {
    expect(getPartialCfi(new LocatorLocations({}))).toBeUndefined();
  });

  it('get Locations {domRange} when available', () => {
    expect(
      getDomRange(new LocatorLocations({
        otherLocations: new Map<string, any>([
          ['domRange', { start: { cssSelector: 'p', textNodeIndex: 4 } }],
        ]),
      }))
    ).toEqual(
      new DomRange({
        start: new DomRangePoint({ cssSelector: 'p', textNodeIndex: 4 }),
      })
    );
  });

  it('get Locations {domRange} when missing', () => {
    expect(getDomRange(new LocatorLocations({}))).toBeUndefined();
  });
});
