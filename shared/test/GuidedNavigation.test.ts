import { Link, Links } from '../src/publication/Link';
import { GuidedNavigationDocument, GuidedNavigationObject, GuidedNavigationText } from '../src/publication/GuidedNavigation';

describe('GuidedNavigation Tests', () => {
  describe('GuidedNavigationText', () => {
    it('handles null input', () => {
      expect(GuidedNavigationText.deserialize(null)).toBeUndefined();
    });

    it('parse minimal JSON', () => {
      const text = GuidedNavigationText.deserialize('Hello World');
      expect(text).toBeDefined();
      expect(text?.plain).toBe('Hello World');
      expect(text?.ssml).toBeUndefined();
      expect(text?.language).toBeUndefined();
    });

    it('parse full JSON', () => {
      const text = GuidedNavigationText.deserialize({
        plain: 'Hello',
        ssml: '<speak>Hello</speak>',
        language: 'en'
      });
      expect(text).toBeDefined();
      expect(text?.plain).toBe('Hello');
      expect(text?.ssml).toBe('<speak>Hello</speak>');
      expect(text?.language).toBe('en');
    });

    it('parse undefined JSON', () => {
      expect(GuidedNavigationText.deserialize(undefined)).toBeUndefined();
    });

    it('serialize works fine', () => {
      const text = new GuidedNavigationText({
        plain: 'Hello',
        ssml: '<speak>Hello</speak>',
        language: 'en'
      });
      expect(text.serialize()).toEqual({
        plain: 'Hello',
        ssml: '<speak>Hello</speak>',
        language: 'en'
      });
    });

    it('returns undefined when no properties are set', () => {
      const text = new GuidedNavigationText({});
      expect(text.serialize()).toBeUndefined();
    });

    it('handles ssml without plain text', () => {
      const text = new GuidedNavigationText({
        ssml: '<speak>Hello</speak>',
        language: 'en'
      });
      expect(text.serialize()).toEqual({
        ssml: '<speak>Hello</speak>',
        language: 'en'
      });
    });

    it('handles language without ssml', () => {
      const text = new GuidedNavigationText({
        plain: 'Hello',
        language: 'en'
      });
      expect(text.serialize()).toEqual({
        plain: 'Hello',
        language: 'en'
      });
    });
  });

  describe('GuidedNavigationObject', () => {
    it('handles null input', () => {
      expect(GuidedNavigationObject.deserialize(null)).toBeUndefined();
    });

    it('handles undefined input', () => {
      expect(GuidedNavigationObject.deserialize(undefined)).toBeUndefined();
    });

    it('parse minimal JSON', () => {
      const obj = GuidedNavigationObject.deserialize({
        text: 'Hello',
        level: 2
      });
      
      expect(obj).toBeDefined();
      expect(obj?.text?.plain).toBe('Hello');
      expect(obj?.level).toBe(2);
      expect(obj?.audioref).toBeUndefined();
      expect(obj?.imgref).toBeUndefined();
      expect(obj?.textref).toBeUndefined();
      expect(obj?.description).toBeUndefined();
      expect(obj?.role).toBeUndefined();
      expect(obj?.children).toBeUndefined();
    });

    it('parse full JSON', () => {
      const obj = GuidedNavigationObject.deserialize({
        audioref: 'audio.mp3#t=10,20',
        imgref: 'image.jpg',
        textref: 'text.html#fragment',
        role: 'section',
        level: 2,
        text: {
          plain: 'Hello',
          ssml: '<speak>Hello</speak>',
          language: 'en'
        },
        description: new GuidedNavigationObject({
          text: new GuidedNavigationText({ plain: 'Description' })
        }),
        children: [{
          text: 'Child',
          level: 3
        }]
      });
      
      expect(obj).toBeDefined();
      expect(obj?.audioref).toBe('audio.mp3#t=10,20');
      expect(obj?.imgref).toBe('image.jpg');
      expect(obj?.textref).toBe('text.html#fragment');
      expect(obj?.role).toEqual(new Set(['section']));
      expect(obj?.level).toBe(2);
      expect(obj?.text?.plain).toBe('Hello');
      expect(obj?.text?.ssml).toBe('<speak>Hello</speak>');
      expect(obj?.text?.language).toBe('en');
      expect(obj?.description?.text?.plain).toBe('Description');
      expect(obj?.children).toHaveLength(1);
      expect(obj?.children?.[0].text?.plain).toBe('Child');
      expect(obj?.children?.[0].level).toBe(3);
    });

    it('level is clamped between 1 and 6', () => {
      const tooLow = new GuidedNavigationObject({ 
        text: new GuidedNavigationText({ plain: 'Test' }), 
        level: 0 
      });
      const tooHigh = new GuidedNavigationObject({ 
        text: new GuidedNavigationText({ plain: 'Test' }), 
        level: 7 
      });
      
      expect(tooLow.level).toBe(1);
      expect(tooHigh.level).toBe(6);
    });

    it('audioFile and audioTime work fine', () => {
      const withTime = new GuidedNavigationObject({ 
        audioref: 'audio.mp3#t=10,20',
        text: new GuidedNavigationText({ plain: 'Test' })
      });
      
      expect(withTime.audioFile).toBe('audio.mp3');
      expect(withTime.audioTime).toBe('t=10,20');
    });

    it('clip works fine', () => {
      const withTime = new GuidedNavigationObject({ 
        audioref: 'audio.mp3#t=10,20',
        text: new GuidedNavigationText({ plain: 'Test' })
      });
      
      const clip = withTime.clip;
      expect(clip).toBeDefined();
      if (clip) {
        expect(clip.audioResource).toBe('audio.mp3');
        expect(clip.start).toBe(10);
        expect(clip.end).toBe(20);
      }
    });

    it('textFile and fragmentId work fine', () => {
      const withRef = new GuidedNavigationObject({ 
        textref: 'text.html#fragment',
        text: new GuidedNavigationText({ plain: 'Test' })
      });
      
      expect(withRef.textFile).toBe('text.html');
      expect(withRef.fragmentId).toBe('fragment');
    });

    it('serializes all properties correctly', () => {
      const obj = new GuidedNavigationObject({
        audioref: 'audio.mp3#t=10,20',
        imgref: 'image.jpg',
        textref: 'text.html#fragment',
        role: new Set(['section']),
        level: 2,
        text: new GuidedNavigationText({
          plain: 'Hello',
          ssml: '<speak>Hello</speak>',
          language: 'en'
        }),
        description: new GuidedNavigationObject({
          text: new GuidedNavigationText({ plain: 'Description' })
        }),
        children: [
          new GuidedNavigationObject({
            text: new GuidedNavigationText({ plain: 'Child' }),
            level: 3
          })
        ]
      });

      const serialized = obj.serialize();
      
      expect(serialized).toEqual({
        audioref: 'audio.mp3#t=10,20',
        imgref: 'image.jpg',
        textref: 'text.html#fragment',
        role: ['section'],
        level: 2,
        text: {
          plain: 'Hello',
          ssml: '<speak>Hello</speak>',
          language: 'en'
        },
        description: new GuidedNavigationObject({
          text: new GuidedNavigationText({ plain: 'Description' })
        }),
        children: [{
          text: { plain: 'Child' },
          level: 3
        }]
      });
    });

    it('omits undefined properties during serialization', () => {
      const obj = new GuidedNavigationObject({
        text: new GuidedNavigationText({ plain: 'Test' }),
        level: 1
      });

      const serialized = obj.serialize();
      
      expect(serialized).toEqual({
        text: { plain: 'Test' },
        level: 1
      });
    });

    it('handles empty text object', () => {
      const obj = new GuidedNavigationObject({
        text: new GuidedNavigationText({}),
        level: 1
      });
      
      const serialized = obj.serialize();
      expect(serialized).toEqual({
        level: 1
      });
    });

    it('handles all properties together', () => {
      const obj = new GuidedNavigationObject({
        audioref: 'audio.mp3',
        imgref: 'image.jpg',
        textref: 'text.html',
        role: new Set(['section', 'note']),
        level: 2,
        text: new GuidedNavigationText({
          plain: 'Hello',
          ssml: '<speak>Hello</speak>',
          language: 'en'
        }),
        description: new GuidedNavigationObject({
          text: new GuidedNavigationText({ plain: 'Test description' })
        }),
        children: [
          new GuidedNavigationObject({
            text: new GuidedNavigationText({ plain: 'Child' }),
            level: 3
          })
        ]
      });

      const serialized = obj.serialize();
      expect(serialized).toEqual({
        audioref: 'audio.mp3',
        imgref: 'image.jpg',
        textref: 'text.html',
        role: ['section', 'note'],
        level: 2,
        text: {
          plain: 'Hello',
          ssml: '<speak>Hello</speak>',
          language: 'en'
        },
        description: {
          text: { plain: "Test description" }
        },
        children: [{
          text: { plain: 'Child' },
          level: 3
        }]
      });
    });
  });

  describe('GuidedNavigationDocument', () => {
    it('handles null input', () => {
      expect(GuidedNavigationDocument.deserialize(null)).toBeUndefined();
    });

    it('handles undefined input', () => {
      expect(GuidedNavigationDocument.deserialize(undefined)).toBeUndefined();
    });

    it('parse minimal JSON', () => {
      const doc = GuidedNavigationDocument.deserialize({
        guided: [{
          text: 'Hello',
          level: 1
        }]
      });
      
      expect(doc).toBeDefined();
      expect(doc?.guided).toHaveLength(1);
      expect(doc?.guided?.[0].text?.plain).toBe('Hello');
      expect(doc?.guided?.[0].level).toBe(1);
    });

    it('parse JSON with links', () => {
      const doc = GuidedNavigationDocument.deserialize({
        links: [{
          href: 'http://example.com',
          rel: ['self']
        }],
        guided: [{
          text: 'Hello',
          level: 1
        }]
      });
      
      expect(doc).toBeDefined();
      expect(doc?.links).toBeDefined();
      if (doc?.links) {
        expect(doc.links.items.length).toBe(1);
        const link = doc.links.items[0];
        expect(link.href).toBe('http://example.com');
      }
      expect(doc?.guided).toHaveLength(1);
    });

    it('serializes with guided navigation objects', () => {
      const doc = new GuidedNavigationDocument({
        guided: [
          new GuidedNavigationObject({
            text: new GuidedNavigationText({ plain: 'Hello' }),
            level: 1
          }),
          new GuidedNavigationObject({
            text: new GuidedNavigationText({ plain: 'World' }),
            level: 2
          })
        ]
      });
      
      const serialized = doc.serialize();
      expect(serialized).toEqual({
        guided: [
          {
            text: { plain: 'Hello' },
            level: 1
          },
          {
            text: { plain: 'World' },
            level: 2
          }
        ]
      });
    });

    it('serializes with links', () => {
      const links = new Links([
        new Link({
          href: 'http://example.com',
          rels: new Set(['self'])
        })
      ]);

      const doc = new GuidedNavigationDocument({
        links,
        guided: [
          new GuidedNavigationObject({
            text: new GuidedNavigationText({ plain: 'Test' }),
            level: 1
          })
        ]
      });
      
      const serialized = doc.serialize();
      expect(serialized).toEqual({
        links: [
          { href: 'http://example.com', rel: ['self'] }
        ],
        guided: [
          {
            text: { plain: 'Test' },
            level: 1
          }
        ]
      });
    });

    it('handles empty guided array', () => {
      const doc = GuidedNavigationDocument.deserialize({
        guided: []
      });
      
      expect(doc).toBeDefined();
      expect(doc?.guided).toHaveLength(0);
    });

    it('handles both links and guided', () => {
      const doc = new GuidedNavigationDocument({
        links: new Links([
          new Link({
            href: 'http://example.com',
            rels: new Set(['self'])
          })
        ]),
        guided: [
          new GuidedNavigationObject({
            text: new GuidedNavigationText({ plain: 'Test' }),
            level: 1
          })
        ]
      });

      const serialized = doc.serialize();
      expect(serialized).toEqual({
        links: [
          { href: 'http://example.com', rel: ['self'] }
        ],
        guided: [
          {
            text: { plain: 'Test' },
            level: 1
          }
        ]
      });
    });
  });
});
