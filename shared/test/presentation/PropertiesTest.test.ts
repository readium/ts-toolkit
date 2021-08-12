import {
  Fit,
  Orientation,
  Overflow,
  Page,
  Properties,
  Spread,
} from '../../src';

describe('Presentation Properties Tests', () => {
  it('get Properties {clipped} when available', () => {
    expect(new Properties({ clipped: true }).getClipped()).toEqual(true);
  });

  it('get Properties {clipped} when missing', () => {
    expect(new Properties({}).getClipped()).toBeUndefined();
  });

  it('get Properties {fit} when available', () => {
    expect(new Properties({ fit: 'cover' }).getFit()).toEqual(Fit.cover);
  });

  it('get Properties {fit} when missing', () => {
    expect(new Properties({}).getFit()).toBeUndefined();
  });

  it('get Properties {orientation} when available', () => {
    expect(
      new Properties({ orientation: 'landscape' }).getOrientation()
    ).toEqual(Orientation.landscape);
  });

  it('get Properties {orientation} when missing', () => {
    expect(new Properties({}).getOrientation()).toBeUndefined();
  });

  it('get Properties {overflow} when available', () => {
    expect(new Properties({ overflow: 'scrolled' }).getOverflow()).toEqual(
      Overflow.scrolled
    );
  });

  it('get Properties {overflow} when missing', () => {
    expect(new Properties({}).getOverflow()).toBeUndefined();
  });

  it('get Properties {page} when available', () => {
    expect(new Properties({ page: 'right' }).getPage()).toEqual(Page.right);
  });

  it('get Properties {page} when missing', () => {
    expect(new Properties({}).getPage()).toBeUndefined();
  });

  it('get Properties {spread} when available', () => {
    expect(new Properties({ spread: 'both' }).getSpread()).toEqual(Spread.both);
  });

  it('get Properties {spread} when missing', () => {
    expect(new Properties({}).getSpread()).toBeUndefined();
  });
});
