/* Copyright 2021 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { Injections } from '../src';

describe('Injections Tests', () => {
  const injections = [
    /*
      for each link with type 'text/html' and property 'contains: mathml'
        inject resource '/lib/mathjax.js' in a <script>, as the last element in <body>
    */
    {
      predicates: [
        {
          type: 'text/html',
          properties: {
            contains: 'mathml',
          },
        },
      ],
      resources: [
        {
          href: '/lib/mathjax.js',
          type: 'application/javascript',
          target: 'body',
          insertion: 'append',
        },
      ],
    },
    /*
      for each link with type 'text/html' or type 'application/xhtml+xml'
        inject resource '/rs/epubReadingSystem.js' in a <script>, as the last element in <body>
        inject resource '/readium-css/ReadiumCSS-before.css' in a <link rel='stylesheet'>, as the first element in <head>
        inject resource '/readium-css/ReadiumCSS-after.css' in a <link rel='stylesheet'>, as the last element in <head>
    */
    {
      predicates: [
        {
          type: 'text/html',
        },
        {
          type: 'application/xhtml+xml',
        },
      ],
      resources: [
        {
          href: '/rs/epubReadingSystem.js',
          type: 'application/javascript',
          target: 'head',
          insertion: 'prepend',
        },
        {
          href: '/readium-css/ReadiumCSS-before.css',
          type: 'text/css',
          target: 'head',
          insertion: 'prepend',
          preload: true,
        },
        {
          href: '/readium-css/ReadiumCSS-after.css',
          type: 'text/css',
          target: 'head',
          insertion: 'append',
          preload: true,
        },
      ],
    },
  ];

  it('test', async () => {
    expect(Injections.deserialize(injections)).toEqual({
      items: [
        {
          predicates: [
            { properties: { contains: 'mathml' }, type: 'text/html' },
          ],
          resources: [
            {
              href: '/lib/mathjax.js',
              insertion: 'append',
              preload: false,
              target: 'body',
              type: 'application/javascript',
            },
          ],
        },
        {
          predicates: [
            { properties: undefined, type: 'text/html' },
            { properties: undefined, type: 'application/xhtml+xml' },
          ],
          resources: [
            {
              href: '/rs/epubReadingSystem.js',
              insertion: 'prepend',
              preload: false,
              target: 'head',
              type: 'application/javascript',
            },
            {
              href: '/readium-css/ReadiumCSS-before.css',
              insertion: 'prepend',
              preload: true,
              target: 'head',
              type: 'text/css',
            },
            {
              href: '/readium-css/ReadiumCSS-after.css',
              insertion: 'append',
              preload: true,
              target: 'head',
              type: 'text/css',
            },
          ],
        },
      ],
    });
  });
});
