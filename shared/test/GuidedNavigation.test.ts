import {
  GuidedNavigationDescription,
  GuidedNavigationDocument,
  GuidedNavigationObject,
  GuidedNavigationText
} from '../src/publication/GuidedNavigation';

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

    it('rejects an empty string', () => {
      expect(GuidedNavigationText.deserialize('')).toBeUndefined();
    });

    it('rejects an object with neither plain nor ssml', () => {
      expect(GuidedNavigationText.deserialize({ language: 'en' })).toBeUndefined();
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

  describe('GuidedNavigationDescription', () => {
    it('handles null input', () => {
      expect(GuidedNavigationDescription.deserialize(null)).toBeUndefined();
    });

    it('parse full JSON', () => {
      const description = GuidedNavigationDescription.deserialize({
        audioref: 'description.mp3#t=0,5',
        imgref: 'image.jpg',
        textref: 'text.html#desc',
        videoref: 'video.mp4',
        text: 'A cowboy is looking at the city.'
      });
      expect(description?.audioref).toBe('description.mp3#t=0,5');
      expect(description?.imgref).toBe('image.jpg');
      expect(description?.textref).toBe('text.html#desc');
      expect(description?.videoref).toBe('video.mp4');
      expect(description?.text?.plain).toBe('A cowboy is looking at the city.');
    });

    it('rejects JSON with none of the refs nor text', () => {
      expect(GuidedNavigationDescription.deserialize({})).toBeUndefined();
      expect(GuidedNavigationDescription.deserialize({ role: ['image'] })).toBeUndefined();
    });

    it('serializes all properties correctly', () => {
      const description = new GuidedNavigationDescription({
        audioref: 'description.mp3',
        videoref: 'video.mp4',
        text: new GuidedNavigationText({ plain: 'Description' })
      });
      expect(description.serialize()).toEqual({
        audioref: 'description.mp3',
        videoref: 'video.mp4',
        text: { plain: 'Description' }
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
        text: 'Hello'
      });

      expect(obj).toBeDefined();
      expect(obj?.text?.plain).toBe('Hello');
      expect(obj?.id).toBeUndefined();
      expect(obj?.audioref).toBeUndefined();
      expect(obj?.imgref).toBeUndefined();
      expect(obj?.textref).toBeUndefined();
      expect(obj?.videoref).toBeUndefined();
      expect(obj?.description).toBeUndefined();
      expect(obj?.role).toBeUndefined();
      expect(obj?.children).toBeUndefined();
    });

    it('parse full JSON', () => {
      const obj = GuidedNavigationObject.deserialize({
        id: 'p1',
        audioref: 'audio.mp3#t=10,20',
        imgref: 'image.jpg',
        textref: 'text.html#fragment',
        videoref: 'video.mp4#t=5',
        role: 'section',
        text: {
          plain: 'Hello',
          ssml: '<speak>Hello</speak>',
          language: 'en'
        },
        description: {
          text: 'Description'
        },
        children: [{
          text: 'Child'
        }]
      });

      expect(obj).toBeDefined();
      expect(obj?.id).toBe('p1');
      expect(obj?.audioref).toBe('audio.mp3#t=10,20');
      expect(obj?.imgref).toBe('image.jpg');
      expect(obj?.textref).toBe('text.html#fragment');
      expect(obj?.videoref).toBe('video.mp4#t=5');
      expect(obj?.role).toEqual(new Set(['section']));
      expect(obj?.text?.plain).toBe('Hello');
      expect(obj?.text?.ssml).toBe('<speak>Hello</speak>');
      expect(obj?.text?.language).toBe('en');
      expect(obj?.description?.text?.plain).toBe('Description');
      expect(obj?.children).toHaveLength(1);
      expect(obj?.children?.[0].text?.plain).toBe('Child');
    });

    it('rejects JSON with none of the refs, text, nor children', () => {
      expect(GuidedNavigationObject.deserialize({ id: 'p1', role: ['paragraph'] })).toBeUndefined();
      expect(GuidedNavigationObject.deserialize({ children: [] })).toBeUndefined();
    });

    it('accepts JSON with only children', () => {
      const obj = GuidedNavigationObject.deserialize({ children: [{ text: 'Child' }] });
      expect(obj?.children).toHaveLength(1);
    });

    it('drops invalid children', () => {
      const obj = GuidedNavigationObject.deserialize({
        text: 'Parent',
        children: [{ text: 'Child' }, { role: ['paragraph'] }]
      });
      expect(obj?.children).toHaveLength(1);
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
        id: 'p1',
        audioref: 'audio.mp3#t=10,20',
        imgref: 'image.jpg',
        textref: 'text.html#fragment',
        videoref: 'video.mp4',
        role: new Set(['section', 'note']),
        text: new GuidedNavigationText({
          plain: 'Hello',
          ssml: '<speak>Hello</speak>',
          language: 'en'
        }),
        description: new GuidedNavigationDescription({
          text: new GuidedNavigationText({ plain: 'Description' })
        }),
        children: [
          new GuidedNavigationObject({
            text: new GuidedNavigationText({ plain: 'Child' })
          })
        ]
      });

      expect(obj.serialize()).toEqual({
        id: 'p1',
        audioref: 'audio.mp3#t=10,20',
        imgref: 'image.jpg',
        textref: 'text.html#fragment',
        videoref: 'video.mp4',
        role: ['section', 'note'],
        text: {
          plain: 'Hello',
          ssml: '<speak>Hello</speak>',
          language: 'en'
        },
        description: {
          text: { plain: 'Description' }
        },
        children: [{
          text: { plain: 'Child' }
        }]
      });
    });

    it('omits undefined properties during serialization', () => {
      const obj = new GuidedNavigationObject({
        text: new GuidedNavigationText({ plain: 'Test' })
      });

      expect(obj.serialize()).toEqual({
        text: { plain: 'Test' }
      });
    });

    it('handles empty text object', () => {
      const obj = new GuidedNavigationObject({
        textref: 'text.html',
        text: new GuidedNavigationText({})
      });

      expect(obj.serialize()).toEqual({
        textref: 'text.html'
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
          text: 'Hello'
        }]
      });

      expect(doc).toBeDefined();
      expect(doc?.guided).toHaveLength(1);
      expect(doc?.guided[0].text?.plain).toBe('Hello');
    });

    it('rejects a missing or empty guided array', () => {
      expect(GuidedNavigationDocument.deserialize({})).toBeUndefined();
      expect(GuidedNavigationDocument.deserialize({ guided: [] })).toBeUndefined();
    });

    it('rejects a guided array with no valid object', () => {
      expect(GuidedNavigationDocument.deserialize({ guided: [{ role: ['paragraph'] }] })).toBeUndefined();
    });

    it('serializes with guided navigation objects', () => {
      const doc = new GuidedNavigationDocument({
        guided: [
          new GuidedNavigationObject({
            text: new GuidedNavigationText({ plain: 'Hello' })
          }),
          new GuidedNavigationObject({
            text: new GuidedNavigationText({ plain: 'World' })
          })
        ]
      });

      expect(doc.serialize()).toEqual({
        guided: [
          { text: { plain: 'Hello' } },
          { text: { plain: 'World' } }
        ]
      });
    });
  });
});
