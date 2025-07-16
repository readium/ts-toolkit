import { Properties } from '../../src';

describe('Divina Properties Tests', () => {
  describe('getBreakScrollBefore', () => {
    it('returns false when break-scroll-before is not set', () => {
      const properties = new Properties({});
      expect(properties.getBreakScrollBefore()).toBe(false);
    });

    it('returns true when break-scroll-before is true', () => {
      const properties = new Properties({
        'break-scroll-before': true
      });
      expect(properties.getBreakScrollBefore()).toBe(true);
    });

    it('returns false when break-scroll-before is false', () => {
      const properties = new Properties({
        'break-scroll-before': false
      });
      expect(properties.getBreakScrollBefore()).toBe(false);
    });
  });
});
