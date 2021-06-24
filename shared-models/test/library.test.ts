//import api, { JellybooksAPI } from '../src';
// import fs from 'fs';
// import { Links, Metadata } from '../src';
// import { LocalizedString } from '../src/Publication/LocalizedString';
import {  Manifest } from '../src';
//import { Manifest } from '../src/Publication/Manifest';
//import { Publication } from '../src/Publication/Publication';
//import { JSONDictionary } from '../src/Publication/Publication+JSON';
//import { LocalizedString } from '../src/Publication/LocalizedString';
//import { Contributors } from '../src/Publication/Contributor';
//import { LocalizedString } from '../src/Publication/LocalizedString';


describe('library', () => {
  // it('works', () => {
  //   const lib: JellybooksAPI = api();

  //   fs.readFile('./test/manifest.json', 'utf8', (err, data) => {
  //     if (err) throw err;

  //     let manifest: Manifest = lib.createManifest(data);

  //     const pubObj: Publication = lib.createPublication(manifest);

  //     expect(pubObj).toBeDefined();
  //   });
  // });

  it('test1', () => {

    // const manifest = new Manifest({
    //   metadata: {
    //     title: "Audiobook"
    //   },
    //   links: [
    //     {
    //       "rel": "cover",
    //       "href": "cover.jpg"
    //     }
    //   ],
    //   readingOrder: [
    //     { href: "track-1.mp3", type: "audio/mpeg" },
    //     { href: "track-2.mp3", type: "audio/mpeg" },
    //     { href: "track-3.mp3", type: "audio/mpeg", title: "Fallback Title" },
    //     { href: "track-4.mp3", type: "audio/mpeg" }
    //   ],
    //   toc: [
    //     {
    //       href: "track-1.mp3",
    //       title: "Track 1"
    //     },
    //     {
    //       href: "track-2.mp3",
    //       title: "Track 2"
    //     },
    //     {
    //       href: "track-3.mp3#t=10",
    //       title: "Track 3"
    //     },
    //     {
    //       href: "track-4.mp3",
    //       title: "Track 4"
    //     }
    //   ]
    // });


    const manifest = Manifest.fromJSON2({
      metadata: {
        title: {"en": "Alice's Adventures in Wonderland"},
        rendition: {
          layout: "fixed",
          orientation: "portrait",
          spread: "none"
        }
      },
      links: [
        { href: "a-link.html" }
      ],
      spine: [
        { href: "spine-item-1.html", type: "text/html" },
        { href: "spine-item-2.html" },
        { href: "jellybooks_bookplate.xhtml", title: "Spine title" },
        { href: "jellybooks_buy.xhtml" },
        { href: "jellybooks_data.xhtml" },
        { href: "spine-item-3.html" }
      ],
      resources: [
        { href: "contents.html", rel: ["contents"] },
        { href: "cover.jpg", rel: "cover" }
      ],
      toc: [
        { href: "spine-item-1.html", title: "Chapter 1" },
        {
          href: "spine-item-2.html",
          title: "Chapter 2",
          children: [
            { href: "spine-item-3.html", title: "Chapter 3" }
          ]
        }
      ],
    });

//console.log(manifest);

// let y:Array<string> = ['a','b']
// let u=[...y.map((x) => x)];;
// console.log(u);

    //console.log(manifest);
    console.log(JSON.stringify(manifest.toJSON()));



    // let s = new Set<string>(["ali","veli"]);
    // let y=new Array<string>();
    // s.forEach(x=>y.push(x))
    // console.log(y);
    //let x = Array<string>();


    // const manifest = Manifest.fromJSON({
    //   "metadata": { "title": "Title" },
    //   "links": [],
    //   "readingOrder": []
    // });

    // const manifest2 = new Manifest(
    //   {
    //     metadata: new Metadata({ title: new LocalizedString("Title") }),
    //     links: new Links([]),
    //     readingOrder: new Links([])
    //   }
    // );


    // let y = new LocalizedString( {en:"ali"});
    // let u = {title : y.toJSON()};
    // console.log(u);

    //  console.log(LocalizedString.getAsString(manifest.metadata.title) === "Alice's Adventures in Wonderland");
    //  console.log(JSON.stringify(manifest.metadata.title));

    // console.log(manifest2);
    // console.log(JSON.stringify(manifest) === JSON.stringify(manifest2));

    // expect(manifest).toEqual(manifest2);

    //const lib: JellybooksAPI = api();

    // const json2 = new JSONDictionary(`{
    //   "title": "Title"
    // }`);


    // let title = LocalizedString.fromJSON(json2.parseRaw("title"));

    // console.log(title);
    // console.log(title.getString("en"));

    // const json2 = new JSONDictionary({
    //   "author": "Thomas Hardy"
    // });

    // const json2 = new JSONDictionary({
    //   "author": {
    //     "name": "Thomas Hardy"
    //   }
    // });

    // const json2 = new JSONDictionary({
    //   "author": 
    //     [{"name": "Thomas Hardy1"},
    //     {"name": "Thomas Hardy2"}]

    // });


    // let k1: Contributors = Contributors.fromJSON(json2.parseArray("author", true));

    // console.log(k1);
    // console.log(JSON.stringify(k1));



    // const json2 = new JSONDictionary({
    //   "title" : {
    //   "en" : "english",
    //   "de" : "deutch"
    //   }
    // });

    // const json2 = new JSONDictionary({
    //   "title": "english"
    // });

    // let k1:LocalizedString = new LocalizedString(json2.parseRaw("title"));
    // console.log(k1.getString("en"));
    // console.log(k1.getString("de"));
    // console.log(k1.getString("gb"));

    //console.log(typeof json.json["title"]);
    //console.log(typeof json2.json["title"]);

    // let k1:string | ILocalizedString = json.parseRaw("title");
    // let k2:string | ILocalizedString = json2.parseRaw("title");

    // console.log(typeof k1);
    // console.log(typeof k2);
    //console.log(k);


    // let x = getLocalizedStringFromJSON(json2.parseRaw("title")); // as ILocalizedString;

    // console.log(x);

    // console.log(getLocalizedStringTranslation(x, "en"));
    // console.log(getLocalizedStringTranslation(x, "de"));
    // console.log(getLocalizedStringTranslation(x, "gb"));

    // fs.readFile('./test/manifest.json', 'utf8', (err, data) => {
    //   if (err) throw err;

    //   const json = new JSONDictionary(data);

    //   console.log(json.parseRaw("metadata"));
    //   //this.title = json.parseRaw('title');



    //   expect(json).toBeDefined();
    // });


  });



});
