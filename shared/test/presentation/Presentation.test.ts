import {
  EPUBLayout,
  Fit,
  Orientation,
  Overflow,
  Page,
  Presentation,
  Spread,
} from '../../src';

describe('Presentation Tests', () => {
  it('parse minimal JSON', () => {
    expect(Presentation.deserialize({})).toEqual(new Presentation({}));
  });

  it('parse undefined JSON', () => {
    expect(Presentation.deserialize(undefined)).toBeUndefined();
  });

  it('parse full JSON', () => {
    expect(
      Presentation.deserialize({
        clipped: true,
        continuous: false,
        fit: 'cover',
        orientation: 'landscape',
        overflow: 'paginated',
        spread: 'both',
        layout: 'fixed',
      })
    ).toEqual(
      new Presentation({
        clipped: true,
        continuous: false,
        fit: Fit.cover,
        orientation: Orientation.landscape,
        overflow: Overflow.paginated,
        spread: Spread.both,
        layout: EPUBLayout.fixed,
      })
    );
  });

  it('get minimal JSON', () => {
    expect(new Presentation({}).serialize()).toEqual({});
  });

  it('get full JSON', () => {
    expect(
      new Presentation({
        clipped: true,
        continuous: false,
        fit: Fit.cover,
        orientation: Orientation.landscape,
        overflow: Overflow.paginated,
        spread: Spread.both,
        layout: EPUBLayout.fixed,
      }).serialize()
    ).toEqual({
      clipped: true,
      continuous: false,
      fit: 'cover',
      orientation: 'landscape',
      overflow: 'paginated',
      spread: 'both',
      layout: 'fixed',
    });
  });

  it('parse fit from JSON value', () => {
    expect(Fit.width).toEqual('width');
    expect(Fit.height).toEqual('height');
    expect(Fit.contain).toEqual('contain');
    expect(Fit.cover).toEqual('cover');
    expect((Fit as any)['foobar']).toBeUndefined();
    expect((Fit as any)['']).toBeUndefined();
  });

  it('get fit JSON value', () => {
    expect((Fit as any)['width']).toEqual(Fit.width);
    expect((Fit as any)['height']).toEqual(Fit.height);
    expect((Fit as any)['contain']).toEqual(Fit.contain);
    expect((Fit as any)['cover']).toEqual(Fit.cover);
  });

  it('parse orientation from JSON value', () => {
    expect(Orientation.auto).toEqual('auto');
    expect(Orientation.landscape).toEqual('landscape');
    expect(Orientation.portrait).toEqual('portrait');
    expect((Orientation as any)['foobar']).toBeUndefined();
    expect((Orientation as any)['']).toBeUndefined();
  });

  it('get orientation JSON value', () => {
    expect((Orientation as any)['auto']).toEqual(Orientation.auto);
    expect((Orientation as any)['landscape']).toEqual(Orientation.landscape);
    expect((Orientation as any)['portrait']).toEqual(Orientation.portrait);
  });

  it('parse overflow from JSON value', () => {
    expect(Overflow.auto).toEqual('auto');
    expect(Overflow.paginated).toEqual('paginated');
    expect(Overflow.scrolled).toEqual('scrolled');
    expect((Overflow as any)['foobar']).toBeUndefined();
    expect((Overflow as any)['']).toBeUndefined();
  });

  it('get overflow JSON value', () => {
    expect((Overflow as any)['auto']).toEqual(Overflow.auto);
    expect((Overflow as any)['paginated']).toEqual(Overflow.paginated);
    expect((Overflow as any)['scrolled']).toEqual(Overflow.scrolled);
  });

  it('parse page from JSON value', () => {
    expect(Page.left).toEqual('left');
    expect(Page.right).toEqual('right');
    expect(Page.center).toEqual('center');
    expect((Page as any)['foobar']).toBeUndefined();
    expect((Page as any)['']).toBeUndefined();
  });

  it('get page JSON value', () => {
    expect((Page as any)['left']).toEqual(Page.left);
    expect((Page as any)['right']).toEqual(Page.right);
    expect((Page as any)['center']).toEqual(Page.center);
  });

  it('parse spread from JSON value', () => {
    expect(Spread.auto).toEqual('auto');
    expect(Spread.both).toEqual('both');
    expect(Spread.none).toEqual('none');
    expect(Spread.landscape).toEqual('landscape');
    expect((Spread as any)['foobar']).toBeUndefined();
    expect((Spread as any)['']).toBeUndefined();
  });

  it('get spread JSON value', () => {
    expect((Spread as any)['auto']).toEqual(Spread.auto);
    expect((Spread as any)['both']).toEqual(Spread.both);
    expect((Spread as any)['none']).toEqual(Spread.none);
    expect((Spread as any)['landscape']).toEqual(Spread.landscape);
  });
});
