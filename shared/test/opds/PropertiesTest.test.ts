import {
  Acquisition,
  Availability,
  AvailabilityStatus,
  Copies,
  Holds,
  Link,
  Price,
  Properties,
  getNumberOfItems,
  getPrice,
  getIndirectAcquisitions,
  getHolds,
  getCopies,
  getAvailability,
  getAuthenticate,
} from '../../src';

describe('opds Properties Tests', () => {
  it('get Properties {numberOfItems} when available', () => {
    expect(getNumberOfItems(new Properties({ numberOfItems: 42 }))).toEqual(42);
  });

  it('get Properties {numberOfItems} when missing', () => {
    expect(getNumberOfItems(new Properties({}))).toBeUndefined();
  });

  it('Properties {numberOfItems} must be positive', () => {
    expect(getNumberOfItems(new Properties({ numberOfItems: -20 }))).toBeUndefined();
  });

  it('get Properties {price} when available', () => {
    expect(
      getPrice(new Properties({ price: { currency: 'EUR', value: 4.36 } }))
    ).toEqual(new Price({ currency: 'EUR', value: 4.36 }));
  });

  it('get Properties {price} when missing', () => {
    expect(getPrice(new Properties({}))).toBeUndefined();
  });

  it('get Properties {price} json', () => {
    expect(new Price({ currency: 'EUR', value: 4.36 }).serialize()).toEqual({
      currency: 'EUR',
      value: 4.36,
    });
  });

  it('get Properties {indirectAcquisitions} when available', () => {
    expect(
      getIndirectAcquisitions(new Properties({
        indirectAcquisition: [{ type: 'acq1' }, { type: 'acq2' }],
      }))
    ).toEqual([
      new Acquisition({ type: 'acq1' }),
      new Acquisition({ type: 'acq2' }),
    ]);
  });

  it('get Properties {indirectAcquisitions} json', () => {
    expect(
      new Acquisition({
        type: 'acq1',
        children: [new Acquisition({ type: 'acq2' })],
      }).serialize()
    ).toEqual({ type: 'acq1', children: [{ type: 'acq2' }] });
  });

  it('get Properties {indirectAcquisitions} when missing', () => {
    expect(getIndirectAcquisitions(new Properties({}))).toBeUndefined();
  });

  it('get Properties {holds} when available', () => {
    expect(getHolds(new Properties({ holds: { total: 5 } }))).toEqual(
      new Holds({ total: 5 })
    );
  });

  it('get Properties {holds} json', () => {
    expect(new Holds({ total: 5, position: 3 }).serialize()).toEqual({
      total: 5,
      position: 3,
    });
  });

  it('get Properties {holds} when missing', () => {
    expect(getHolds(new Properties({}))).toBeUndefined();
  });

  it('get Properties {copies} when available', () => {
    expect(getCopies(new Properties({ copies: { total: 5 } }))).toEqual(
      new Copies({ total: 5 })
    );
  });

  it('get Properties {copies} json', () => {
    expect(new Copies({ total: 5, available: 3 }).serialize()).toEqual({
      total: 5,
      available: 3,
    });
  });

  it('get Properties {copies} when missing', () => {
    expect(getCopies(new Properties({}))).toBeUndefined();
  });

  it('get Properties {availability} when available', () => {
    expect(
      getAvailability(new Properties({ availability: { state: 'available' } }))
    ).toEqual(new Availability({ state: AvailabilityStatus.available }));
  });

  it('get Properties {availability} json', () => {
    expect(
      new Availability({
        state: AvailabilityStatus.available,
        since: new Date('2021-07-08T21:38:00.000Z'),
        until: new Date('2021-12-25T00:00:00.000Z'),
      }).serialize()
    ).toEqual({
      state: 'available',
      since: '2021-07-08T21:38:00.000Z',
      until: '2021-12-25T00:00:00.000Z',
    });
  });

  it('get Properties {availability} when missing', () => {
    expect(getAvailability(new Properties({}))).toBeUndefined();
  });

  it('get Properties {authenticate} when missing', () => {
    expect(getAuthenticate(new Properties({}))).toBeUndefined();
  });

  it('get Properties {authenticate} when available', () => {
    expect(
      getAuthenticate(new Properties({
        authenticate: {
          href: 'https://example.com/authentication.json',
          type: 'application/opds-authentication+json',
        },
      }))
    ).toEqual(
      new Link({
        href: 'https://example.com/authentication.json',
        type: 'application/opds-authentication+json',
      })
    );
  });

  it('get Properties {authenticate} when invalid', () => {
    expect(
      getAuthenticate(new Properties({
        authenticate: {
          type: 'application/opds-authentication+json',
        },
      }))
    ).toBeUndefined();
  });
});
