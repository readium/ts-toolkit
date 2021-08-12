import { Link, Links, PublicationCollection } from '../src';

describe('PublicationCollection Tests', () => {
  it('parse minimal JSON', () => {
    expect(
      PublicationCollection.deserialize({
        metadata: {},
        links: [{ href: '/link' }],
      })
    ).toEqual(
      new PublicationCollection({
        links: new Links([new Link({ href: '/link' })]),
      })
    );
  });

  it('parse full JSON', () => {
    expect(
      PublicationCollection.deserialize({
        metadata: {
          metadata1: 'value',
        },
        links: [{ href: '/link' }],
        sub1: {
          links: [{ href: '/sublink' }],
        },
        sub2: [{ href: '/sublink1' }, { href: '/sublink2' }],
        sub3: [
          {
            links: [{ href: '/sublink3' }],
          },
          {
            links: [{ href: '/sublink4' }],
          },
        ],
      })
    ).toEqual(
      new PublicationCollection({
        metadata: new Map<string, any>([['metadata1', 'value']]),
        links: new Links([new Link({ href: '/link' })]),
        subcollections: new Map<string, Array<PublicationCollection>>([
          [
            'sub1',
            [
              new PublicationCollection({
                links: new Links([new Link({ href: '/sublink' })]),
              }),
            ],
          ],
          [
            'sub2',
            [
              new PublicationCollection({
                links: new Links([
                  new Link({ href: '/sublink1' }),
                  new Link({ href: '/sublink2' }),
                ]),
              }),
            ],
          ],
          [
            'sub3',
            [
              new PublicationCollection({
                links: new Links([new Link({ href: '/sublink3' })]),
              }),
              new PublicationCollection({
                links: new Links([new Link({ href: '/sublink4' })]),
              }),
            ],
          ],
        ]),
      })
    );
  });

  it('parse undefined JSON', () => {
    expect(PublicationCollection.deserialize(undefined)).toBeUndefined();
  });

  it('parse full JSON', () => {
    expect(
      PublicationCollection.deserializeCollections({
        sub1: {
          links: [{ href: '/sublink' }],
        },
        sub2: [{ href: '/sublink1' }, { href: '/sublink2' }],
        sub3: [
          {
            links: [{ href: '/sublink3' }],
          },
          {
            links: [{ href: '/sublink4' }],
          },
        ],
      })
    ).toEqual(
      new Map<string, Array<PublicationCollection>>([
        [
          'sub1',
          [
            new PublicationCollection({
              links: new Links([new Link({ href: '/sublink' })]),
            }),
          ],
        ],
        [
          'sub2',
          [
            new PublicationCollection({
              links: new Links([
                new Link({ href: '/sublink1' }),
                new Link({ href: '/sublink2' }),
              ]),
            }),
          ],
        ],
        [
          'sub3',
          [
            new PublicationCollection({
              links: new Links([new Link({ href: '/sublink3' })]),
            }),
            new PublicationCollection({
              links: new Links([new Link({ href: '/sublink4' })]),
            }),
          ],
        ],
      ])
    );
  });

  it('get minimal JSON', () => {
    expect(
      new PublicationCollection({
        metadata: new Map<string, any>(),
        links: new Links([new Link({ href: '/link' })]),
      }).serialize()
    ).toEqual({
      metadata: {},
      links: [{ href: '/link' }],
    });
  });

  it('get full JSON', () => {
    expect(
      new PublicationCollection({
        metadata: new Map<string, any>([['metadata1', 'value']]),
        links: new Links([new Link({ href: '/link' })]),
        subcollections: new Map<string, Array<PublicationCollection>>([
          [
            'sub1',
            [
              new PublicationCollection({
                links: new Links([new Link({ href: '/sublink' })]),
              }),
            ],
          ],
          [
            'sub2',
            [
              new PublicationCollection({
                links: new Links([
                  new Link({ href: '/sublink1' }),
                  new Link({ href: '/sublink2' }),
                ]),
              }),
            ],
          ],
          [
            'sub3',
            [
              new PublicationCollection({
                links: new Links([new Link({ href: '/sublink3' })]),
              }),
              new PublicationCollection({
                links: new Links([new Link({ href: '/sublink4' })]),
              }),
            ],
          ],
        ]),
      }).serialize()
    ).toEqual({
      metadata: {
        metadata1: 'value',
      },
      links: [{ href: '/link' }],
      sub1: {
        links: [{ href: '/sublink' }],
      },
      sub2: {
        links: [{ href: '/sublink1' }, { href: '/sublink2' }],
      },
      sub3: [
        {
          links: [{ href: '/sublink3' }],
        },
        {
          links: [{ href: '/sublink4' }],
        },
      ],
    });
  });

  it('get multiple JSON collections', () => {
    const json: any = {};
    PublicationCollection.serializeCollection(
      json,
      new Map<string, Array<PublicationCollection>>([
        [
          'sub1',
          [
            new PublicationCollection({
              links: new Links([new Link({ href: '/sublink' })]),
            }),
          ],
        ],
        [
          'sub2',
          [
            new PublicationCollection({
              links: new Links([
                new Link({ href: '/sublink1' }),
                new Link({ href: '/sublink2' }),
              ]),
            }),
          ],
        ],
        [
          'sub3',
          [
            new PublicationCollection({
              links: new Links([new Link({ href: '/sublink3' })]),
            }),
            new PublicationCollection({
              links: new Links([new Link({ href: '/sublink4' })]),
            }),
          ],
        ],
      ])
    );
    expect(json).toEqual({
      sub1: {
        links: [{ href: '/sublink' }],
      },
      sub2: {
        links: [{ href: '/sublink1' }, { href: '/sublink2' }],
      },
      sub3: [
        {
          links: [{ href: '/sublink3' }],
        },
        {
          links: [{ href: '/sublink4' }],
        },
      ],
    });
  });
});
