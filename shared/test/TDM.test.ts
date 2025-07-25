import { TDM, TDMReservation } from '../src';

describe('TDM Tests', () => {
  it('parse minimal JSON', () => {
    expect(TDM.deserialize({})).toEqual(new TDM({}));
  });

  it('parse full JSON', () => {
    expect(
      TDM.deserialize({
        reservation: 'all',
        policy: 'Some policy text',
      })
    ).toEqual(
      new TDM({
        reservation: TDMReservation.all,
        policy: 'Some policy text',
      })
    );
  });

  it('parse undefined JSON', () => {
    expect(TDM.deserialize(undefined)).toBeUndefined();
  });

  it('get minimal JSON', () => {
    expect(new TDM({}).serialize()).toEqual({});
  });

  it('get full JSON', () => {
    expect(
      new TDM({
        reservation: TDMReservation.all,
        policy: 'Some policy text',
      }).serialize()
    ).toEqual({
      reservation: 'all',
      policy: 'Some policy text',
    });
  });
});
