# geostyler-web-components

A technology-agnostic Web Component wrapper around the [GeoStyler](https://geostyler.org/) `<Style>` React component.

## Overview

[GeoStyler](https://geostyler.org/) provides a powerful `<Style>` React component for editing cartographic styles. This package wraps it as a standard [Web Component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) (`<geostyler-style-wc>`), making it usable in **any web framework** — Angular, Vue, Svelte, plain HTML — without requiring React knowledge or a React application.

Under the hood, it uses [`@r2wc/react-to-web-component`](https://github.com/bitovi/react-to-web-component) to bridge the React component into the Custom Elements API.

## Features

- Framework-agnostic — works with Angular, Vue, Svelte, or vanilla HTML/JS
- Wraps GeoStyler's `<Style>` component with full style editing capabilities
- Accepts GeoJSON feature data for attribute-based styling
- Emits namespaced `gs-*` custom DOM events (`gs-style-change`, `gs-parsing`, `gs-parse-error`, `gs-warning`)
- Ships as an ES module, ready for use with modern bundlers

## Usage

### Register the custom element

Import the registration module once in your application entry point:

```js
import 'geostyler-web-components/geostyler-web-component';
```

### Use the element in your template

```html
<geostyler-style-wc id="styler"></geostyler-style-wc>
```

### Pass data and style via JavaScript

The element exposes the following properties. Object-valued properties must be
set as JavaScript properties (or JSON-encoded attributes); they cannot be passed
as plain string attributes.

| Property                 | Attribute                  | Type                                | Description                                                                 |
|--------------------------|----------------------------|-------------------------------------|-----------------------------------------------------------------------------|
| `geostylerStyle`         | `geostyler-style`          | `GeoStyler Style` (JSON)            | The cartographic style to display and edit.                                 |
| `data`                   | `data`                     | `GeoJSON FeatureCollection` (JSON)  | GeoJSON data used for attribute-based symbolizers and classification.       |
| `locale`                 | `locale`                   | `string`                            | GeoStyler locale key (e.g. `en_US`, `fr_FR`). Falls back to `en_US`.        |
| `composition`            | `composition`              | `GeoStyler composition` (JSON)      | GeoStyler context composition overrides.                                    |
| `unsupportedProperties`  | `unsupported-properties`   | `object` (JSON)                     | GeoStyler unsupported-properties configuration.                             |
| `nameField`              | `name-field`               | `{ visibility?: boolean }` (JSON)   | Controls the style name field, e.g. `{ "visibility": false }`.              |
| `disableClassification`  | `disable-classification`   | `boolean`                           | Disables the classification UI.                                             |
| `disableMultiEdit`       | `disable-multi-edit`       | `boolean`                           | Disables multi-rule editing.                                                |
| `debounceMs`             | `debounce-ms`              | `number`                            | Debounce delay (ms) for the `gs-style-change` event. Defaults to `0`.       |

```js
const styler = document.getElementById('styler');

styler.geostylerStyle = {
  name: 'My Style',
  rules: []
};

styler.data = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { name: 'Example', value: 42 }
    }
  ]
};
```

### Events

All events are dispatched on the element, `bubbles: true` and `composed: true`,
and are namespaced with a `gs-` prefix to avoid collisions.

| Event             | `detail` type        | Description                                                                 |
|-------------------|----------------------|-----------------------------------------------------------------------------|
| `gs-style-change` | `GeoStyler Style`    | The user edited the style. Debounced by `debounceMs`.                       |
| `gs-parsing`      | `boolean`            | `true` while GeoJSON `data` is being parsed, `false` when finished.         |
| `gs-parse-error`  | `Error`              | The `geostylerStyle` shape is invalid, or `data` could not be parsed.       |
| `gs-warning`      | `string`             | Non-fatal warning, e.g. an unsupported `locale` falling back to `en_US`.    |

```js
styler.addEventListener('gs-style-change', (event) => {
  console.log('Updated style:', event.detail);
});

styler.addEventListener('gs-parsing', (event) => {
  console.log('Parsing:', event.detail);
});

styler.addEventListener('gs-parse-error', (event) => {
  console.error('Parse error:', event.detail.message);
});

styler.addEventListener('gs-warning', (event) => {
  console.warn('Warning:', event.detail);
});
```

### Angular example

```ts
// app.component.ts
import 'geostyler-web-components/geostyler-web-component';
```

```html
<!-- app.component.html -->
<geostyler-style-wc
  #styler
  (gs-style-change)="onStyleChange($event)">
</geostyler-style-wc>
```

```ts
// In your component class
onStyleChange(event: CustomEvent) {
  this.currentStyle = event.detail;
}
```

> In Angular, add `CUSTOM_ELEMENTS_SCHEMA` to the module/component schemas to suppress unknown-element warnings.

#### Server-side rendering (Angular Universal)

This package is a browser-only artifact (it defines a custom element and mounts
React in the DOM). Registration is a no-op when `customElements` is unavailable,
so importing it on the server is safe, but the element should only be used in a
browser context. Import or register it behind a browser guard:

```ts
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

if (isPlatformBrowser(inject(PLATFORM_ID))) {
  await import('geostyler-web-components/geostyler-web-component');
}
```

## Building

```bash
npm run build
```

Output is placed in `dist/`. To watch for changes during development:

```bash
npm run dev
```

## How it works

```
Your App (any framework)
        │
        ▼
<geostyler-style-wc>   ← Custom Element (Web Component)
        │
        ▼
GeostylerStyleAdapter  ← React wrapper component (internal)
        │
        ▼
<Style>                ← GeoStyler React component
```

1. `geostyler-web-component.ts` registers `<geostyler-style-wc>` via `customElements.define`.
2. `GeostylerWebComponent.tsx` uses `@r2wc/react-to-web-component` to mount the React `<Style>` component inside a custom element.
3. GeoJSON data is parsed with `geostyler-geojson-parser` and provided to GeoStyler via `GeoStylerContext`.
4. Style changes bubble up as a `gs-style-change` DOM event.

### Bundle size & multiple instances

Because `@r2wc/react-to-web-component` packs React into the component, the
bundle includes React, GeoStyler and its UI dependencies. This makes the
component a true drop-in for non-React frameworks, at the cost of bundle size.
Using several GeoStyler web components in one application may load more than one
React runtime. Sharing a single React instance across instances is tracked as
future work (see [discussion #2758](https://github.com/orgs/geostyler/discussions/2758)).
