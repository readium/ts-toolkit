# Injection API

The Readium Navigator includes a resource injection system that allows you to dynamically inject CSS, JavaScript, and other resources into EPUB and WebPub content documents. This system is used internally to provide core functionality like ReadiumCSS, script execution control, and CSS selector generation.

> [!IMPORTANT]
> This API is still experimental and may change in future versions.

## When to use

The Injection API is primarily designed to handle static resources that need to be injected into documents at load time, such as:

- **Styling resources** - CSS stylesheets, themes, visual presentation
- **Initialization scripts** - Code that runs once on document load
- **Font resources** - Typography and text rendering assets  
- **Static libraries** - Third-party code that doesn't require ongoing interaction

Although possible, the following use cases are discouraged for this API:

- **Dynamic DOM manipulation** after page load
- **Cross-frame communication** between iframe and parent window
- **Event-driven features** that require ongoing interaction

For these use cases, we are aware that APIs might not exist yet, and Injection API is the only option for now, despite being the wrong tool for the job.

## Overview

The injection system consists of three main components:

- **Injectables**: Definitions of resources to be injected (scripts, stylesheets, etc.)
- **Rules**: Patterns that determine which injectables should be applied to which documents
- **Injector**: The engine that processes rules and injects resources into documents

## Core Concepts

### Injectables

An injectable represents a single resource that can be injected into a document. There are two types:

```typescript
// URL-based injectable (external resource)
const urlInjectable: IUrlInjectable = {
  id: "external-script",
  as: "script",
  url: "https://cdn.example.com/script.js",
  target: "head"
};

// Blob-based injectable (inline content)
const blobInjectable: IBlobInjectable = {
  id: "inline-styles",
  as: "link", 
  blob: new Blob(["body { color: red; }"], { type: "text/css" }),
  rel: "stylesheet",
  target: "head"
};
```

### Injection Rules

Rules define which injectables should be applied to which documents based on URL patterns:

```typescript
const rule: IInjectableRule = {
  resources: [/* Resources from readingOrder or regex patterns */],
  prepend: [/* injectables to load before existing scripts and styles */],
  append: [/* injectables to load after existing scripts and styles */]
};
```

### Understanding prepend vs append

When injecting resources, the order matters:

- **prepend**: Your resources are loaded **before** the built-in and document's existing scripts and styles
- **append**: Your resources are loaded **after** the built-in and document's existing scripts and styles

This affects loading order and can impact how styles cascade or when scripts execute.

### Configuration

The injection system is configured through `IInjectablesConfig`:

```typescript
const config: IInjectablesConfig = {
  rules: [/* array of rules */],
  allowedDomains: ["https://fonts.googleapis.com"] // Optional: allow external domains
};
```

## Injectable Properties

### Core Properties

- **`id`**: Unique identifier for the injectable (auto-generated if not provided)
- **`as`**: Resource type - `"script"` or `"link"`
- **`rel`**: Required when `as` is `"link"` (e.g., `"stylesheet"`, `"preload"`)
- **`target`**: Where to inject - `"head"` or `"body"` (default: `"head"`)

### Resource Properties

For URL-based injectables:
- **`url`**: URL to the resource. Can be:
  - An absolute HTTPS URL (must be in the `allowedDomains` list)
  - A `data:` URL for inline content
  - A `blob:` URL (you are responsible for managing the blob URL lifecycle)

For Blob-based injectables:
- **`blob`**: Blob object containing the resource content. The injector will:
  - Create and cache a `blob:` URL for this resource
  - Reuse the same URL if the same Blob is injected multiple times
  - Automatically revoke the blob URL when it's no longer used or when the injector is disposed

### Optional Properties

- **`type`**: MIME type (inferred from file extension or blob type for CSS and JS resources if not provided)
- **`condition`**: Function to run in the resource's context that determines if the injectable should be applied (target document is passed as a parameter)
- **`attributes`**: Additional HTML attributes (excluding `type`, `rel`, `href`, `src`)

## Conditional Injection

Injectables can be conditionally applied based on document content:

```typescript
const conditionalScript: IInjectable = {
  id: "conditional-script",
  as: "script",
  blob: new Blob(["console.log('Scripts detected!');"], { type: "text/javascript" }),
  condition: (doc: Document) => {
    // Only inject if the document has existing scripts
    return !!doc.querySelector("script");
  }
};
```

## Domain Security

The injection system includes built-in security controls for external resources:

### Allowed Domains

You can allow specific domains for external resources:

```typescript
const config: IInjectablesConfig = {
  rules: [/* rules */],
  allowedDomains: [
    "https://fonts.googleapis.com",
    "https://cdn.jsdelivr.net"
  ]
};
```

### URL Validation

The system only allows:
- URLs from allowed domains
- `data:` URLs
- `blob:` URLs

## Built-in Injectables

### EPUB Content

Core functionality injected into all EPUB content:

- **CSS Selector Generator**: Enables customized CSS selection utilities
- **Execution Prevention**: Blocks script execution when scripts are detected
- **Onload Proxy**: Manages script cleanup when scripts are detected
- **Readium CSS**: Applies reading-optimized styles (only for reflowable documents)

### WebPub Content

Core functionality injected into all WebPub content:

- **CSS Selector Generator**: Enables customized CSS selection utilities
- **WebPub Execution**: Manages WebPub-specific events and state
- **Onload Proxy**: Manages script cleanup
- **Readium CSS WebPub**: Applies WebPub-specific reading styles

## Custom Injection

### Creating Custom Rules

Create rules to inject resources into specific documents. The `resources` array accepts either paths in the reading order or RegExp patterns to match against document URLs.

```typescript
const customRule: IInjectableRule = {
  resources: [/.*\.xhtml$/i], // Matches all .xhtml files (case insensitive)
  prepend: [
    {
      id: "custom-styles",
      as: "link",
      blob: new Blob(["selector { property: value; }"], { type: "text/css" }),
      rel: "stylesheet"
    }
  ],
  append: [
    {
      id: "custom-script",
      as: "script", 
      blob: new Blob(["console.log('Chapter loaded');"], { type: "text/javascript" })
    }
  ]
};
```

### Integrating with EpubNavigator

To use custom injection with `EpubNavigator`, pass your injection rules through the configuration object:

```typescript
const navigator = new EpubNavigator(
  container,
  publication,
  listeners,
  positions,
  initialPosition,
  {
    preferences: { /* your preferences */ },
    defaults: { /* your defaults */ },
    injectables: {
      rules: [/* your custom rules */],
      allowedDomains: [/* allowed domains if needed */]
    }
  }
);
```

## Best Practices

1. **Use Unique IDs**: Always provide meaningful IDs for your injectables
2. **Be Specific with Patterns**: Use precise URL patterns to avoid unintended injections
3. **Secure External Resources**: Always allow domains for external resources
4. **Consider Performance**: Use conditional injection to avoid unnecessary overhead
5. **Test Thoroughly**: Test injection rules with various document types and content

## API Reference

### IInjectableRule Interface

```typescript
interface IInjectableRule {
  resources: Array<string | RegExp>;
  prepend?: IInjectable[];
  append?: IInjectable[];
}
```

### IInjectable Interface

```typescript
interface IBaseInjectable {
  id?: string;
  target?: "head" | "body";
  type?: string;
  condition?: (doc: Document) => boolean;
  attributes?: AllowedAttributes;
}

interface IScriptInjectable extends IBaseInjectable {
  as: "script";
  rel?: never;  // Scripts don't have rel
}

interface ILinkInjectable extends IBaseInjectable {
  as: "link";
  rel: string;  // Required for links
}

interface IUrlInjectable {
  url: string;
}

interface IBlobInjectable {
  blob: Blob;
}

type IInjectable = (IScriptInjectable | ILinkInjectable) & (IUrlInjectable | IBlobInjectable);
```