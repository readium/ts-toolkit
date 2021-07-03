import { Link, Links } from '../src';
import { SubCollection } from '../src/Publication/SubCollection';

describe('SubCollection Tests', () => {
  it('parse minimal JSON', () => {
    expect(
      SubCollection.fromJSON({
        metadata: {},
        links: [{ href: '/link' }],
      })
    ).toEqual(
      new SubCollection({
        links: new Links([new Link({ href: '/link' })]),
      })
    );
  });

  it('parse full JSON', () => {
    expect(
      SubCollection.fromJSON({
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
      new SubCollection({
        metadata: new Map<string, any>([['metadata1', 'value']]),
        links: new Links([new Link({ href: '/link' })]),
        subcollections: new Map<
          string,
          SubCollection | Links | Array<SubCollection>
        >([
          [
            'sub1',
            new SubCollection({
              links: new Links([new Link({ href: '/sublink' })]),
            }),
          ],
          [
            'sub2',
            new Links([
              new Link({ href: '/sublink1' }),
              new Link({ href: '/sublink2' }),
            ]),
          ],
          [
            'sub3',
            [
              new SubCollection({
                links: new Links([new Link({ href: '/sublink3' })]),
              }),
              new SubCollection({
                links: new Links([new Link({ href: '/sublink4' })]),
              }),
            ],
          ],
        ]),
      })
    );
  });

  it('parse undefined JSON', () => {
    expect(SubCollection.fromJSON(undefined)).toBeUndefined();
  });

  it('get minimal JSON', () => {
    expect(
      new SubCollection({
        metadata: new Map<string, any>(),
        links: new Links([new Link({ href: '/link' })]),
      }).toJSON()
    ).toEqual({
      metadata: {},
      links: [{ href: '/link' }],
    });
  });

  it('get full JSON', () => {
    expect(
      new SubCollection({
        metadata: new Map<string, any>([['metadata1', 'value']]),
        links: new Links([new Link({ href: '/link' })]),
        subcollections: new Map<
          string,
          SubCollection | Links | Array<SubCollection>
        >([
          [
            'sub1',
            new SubCollection({
              links: new Links([new Link({ href: '/sublink' })]),
            }),
          ],
          [
            'sub2',
            new Links([
              new Link({ href: '/sublink1' }),
              new Link({ href: '/sublink2' }),
            ]),
          ],
          [
            'sub3',
            [
              new SubCollection({
                links: new Links([new Link({ href: '/sublink3' })]),
              }),
              new SubCollection({
                links: new Links([new Link({ href: '/sublink4' })]),
              }),
            ],
          ],
        ]),
      }).toJSON()
    ).toEqual({
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
    });
  });
});
