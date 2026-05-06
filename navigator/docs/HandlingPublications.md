# Handling Publications

To create an instance of `Navigator`, we need a `Publication` that requires a [Readium Web Publication Manifest](https://readium.org/webpub-manifest/).

We are using Readium Shared Models to handle all of the following.

## Fetching the manifest

Create an instance of `HttpFetcher` with a `FetchImplementation` and a `baseURL`. 

The default for FetchImplementation is `window.fetch` so you can set it to `undefined` if there is no need to customize it.

```js
const fetcher = new HttpFetcher(undefined, publicationURL);
```

Then ask it to get the resource for the manifest’s `Link`.

```js
const manifestLink = new Link({ href: "manifest.json" });
const resource = fetcher.get(manifestLink)
```

A Resource is always returned, since for some cases we can't know if it exists before actually fetching it, such as HTTP. Therefore, errors are handled at the Resource level.

You can then retrieve as JSON.

```js
const manifest = await resource.readAsJSON();
```

You can also get the link for the resource and convert it to a `URL` if needed e.g. setting a self `href` to store progression for the current publication.

```js
const resourceLink = await resource.link();
const selfHref = resourceLink.toURL(publicationURL);
```

## Creating a Publication object

To create a `Publication` object you need a deserialized manifest and a `Fetcher`.

```
const fetcher: Fetcher = new HttpFetcher(undefined, selfHref);
const deserializedManifest = Manifest.deserialize(manifest);
deserializedManifest.setSelfLink(selfHref);

const publication = new Publication({
  manifest: deserializedManifest,
  fetcher: fetcher
});
```

## Fetching the positions list

`EpubNavigator` does not handle publications if they do not have a [positions list](https://readium.org/architecture/models/locators/positions/).

A position list can be useful to users who need to reference or access a specific position in a publication, and can also be useful for UI elements such as a progression bar for the entire publication.

```js
const positionsList = await publication.positionsFromManifest()
```