import { EpubLayout } from '../../src';

describe('EpubLayout Tests', () => {
  it('parse layout', () => {
    expect(EpubLayout['fixed']).toEqual(EpubLayout.fixed);
    expect(EpubLayout['reflowable']).toEqual(EpubLayout.reflowable);
    expect((EpubLayout as any)['foobar']).toBeUndefined();
    expect((EpubLayout as any)['']).toBeUndefined();
  });

  it('get layout value', () => {
    expect(EpubLayout.fixed).toEqual('fixed');
    expect(EpubLayout.reflowable).toEqual('reflowable');
  });
});
