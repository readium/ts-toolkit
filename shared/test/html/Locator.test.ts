import { DomRange, DomRangePoint, LocatorLocations, getCssSelector, getPartialCfi, getDomRange, getTextFragment } from '../../src';

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

  it('get Locations {textFragment} exact match, when available', () => {
    expect(
      getTextFragment(new LocatorLocations({
        fragments: [':~:text=Hello'],
      }))
    ).toEqual({ textStart: 'Hello' });
  });

  it('get Locations {textFragment} range match with prefix/suffix, when available', () => {
    expect(
      getTextFragment(new LocatorLocations({
        fragments: [':~:text=pre-,Hello,World,-post'],
      }))
    ).toEqual({
      prefix: 'pre',
      textStart: 'Hello',
      textEnd: 'World',
      suffix: 'post',
    });
  });

  it('get Locations {textFragment} finds the directive among unrelated fragments', () => {
    expect(
      getTextFragment(new LocatorLocations({
        fragments: ['chapter3', ':~:text=Hello'],
      }))
    ).toEqual({ textStart: 'Hello' });
  });

  it('get Locations {textFragment} finds the directive when glued onto another fragment in the same string', () => {
    expect(
      getTextFragment(new LocatorLocations({
        fragments: ['css(p.chapter):~:text=Hello'],
      }))
    ).toEqual({ textStart: 'Hello' });
  });

  it('get Locations {textFragment} when missing', () => {
    expect(getTextFragment(new LocatorLocations({}))).toBeUndefined();
  });

  it('get Locations {textFragment} ignores fragments without a directive', () => {
    expect(
      getTextFragment(new LocatorLocations({
        fragments: ['chapter3', 'css=p.chapter', 'page=12'],
      }))
    ).toBeUndefined();
  });
});
