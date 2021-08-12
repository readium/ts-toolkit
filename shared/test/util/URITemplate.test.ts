import { URITemplate } from '../../src/util/URITemplate';

describe('URITemplate Tests', () => {
  it('parameters works fine', () => {
    expect(new URITemplate('/url{?x,hello,y}name{z,y,w}').parameters).toEqual(
      new Set(['x', 'hello', 'y', 'z', 'w'])
    );
  });

  it('expand works fine with simple string templates', () => {
    expect(
      new URITemplate('/url{x,hello,y}name{z,y,w}').expand({
        x: 'aaa',
        hello: 'Hello, world',
        y: 'b',
        z: '45',
        w: 'w',
      })
    ).toEqual('/urlaaa,Hello%2C%20world,bname45,b,w');
  });

  it('expand works fine with form-style ampersand-separated templates', () => {
    expect(
      new URITemplate('/url{?x,hello,y}name').expand({
        x: 'aaa',
        hello: 'Hello, world',
        y: 'b',
      })
    ).toEqual('/url?x=aaa&hello=Hello%2C%20world&y=bname');
  });

  it('expand works fine with form-style ampersand-separated templates', () => {
    const parameters = {
      id: '38dfd7ba-a80b-4253-a047-e6aa9c21d6f0',
      name: 'Pixel 3a',
      end: '2020-11-12T16:02:00.000+01:00',
    };

    const urlPart =
      'https://lsd-test.edrlab.org/licenses/39ef1ff2-cda2-4219-a26a-d504fbb24c17/renew';

    const url = new URITemplate(`${urlPart}{?end,id,name}`).expand(parameters);

    const urlParts = url.split('?');

    expect(urlParts[0]).toEqual(urlPart);

    const query = new URLSearchParams(urlParts[1]);

    const parametersParsed: any = {};

    query.forEach((v, k) => (parametersParsed[k] = v));

    expect(parameters).toEqual(parametersParsed);
  });
});
