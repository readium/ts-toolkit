import { EPUBLayout } from '../../src';

describe('EPUBLayout Tests', () => {
  it('parse layout', () => {
    expect(EPUBLayout['fixed']).toEqual(EPUBLayout.fixed);
    expect(EPUBLayout['reflowable']).toEqual(EPUBLayout.reflowable);
    expect((EPUBLayout as any)['foobar']).toBeUndefined();
    expect((EPUBLayout as any)['']).toBeUndefined();
  });

  it('get layout value', () => {
    expect(EPUBLayout.fixed).toEqual('fixed');
    expect(EPUBLayout.reflowable).toEqual('reflowable');
  });
});
