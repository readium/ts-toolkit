import {
  LocalizedString,
  Metadata,
  Orientation,
  Presentation,
} from '../../src';

describe('Presentation Metadata Tests', () => {
  it('get Metadata {presentation} when available', () => {
    expect(
      new Metadata({
        title: new LocalizedString('Title'),
        otherMetadata: {
          presentation: { continuous: false, orientation: 'landscape' },
        },
      }).getPresentation()
    ).toEqual(
      new Presentation({
        continuous: false,
        orientation: Orientation.landscape,
      })
    );
  });

  it('get Metadata {presentation} when missing', () => {
    expect(
      new Metadata({
        title: new LocalizedString('Title'),
      }).getPresentation()
    ).toBeUndefined();
  });
});
