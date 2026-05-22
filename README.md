# @geostyler/web-component

A technology-agnostic Web Component wrapper around the [GeoStyler](https://geostyler.org/) `<Style>` React component.

## Overview

[GeoStyler](https://geostyler.org/) provides a powerful `<Style>` React component for editing cartographic styles. This package wraps it as a standard [Web Component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) (`<geostyler-style-wc>`), making it usable in **any web framework** — Angular, Vue, Svelte, plain HTML — without requiring React knowledge or a React application.

Under the hood, it uses [`@r2wc/react-to-web-component`](https://github.com/bitovi/react-to-web-component) to bridge the React component into the Custom Elements API.

## Features

- Framework-agnostic — works with Angular, Vue, Svelte, or vanilla HTML/JS
- Wraps GeoStyler's `<Style>` component with full style editing capabilities
- Accepts GeoJSON feature data for attribute-based styling
- Emits a `style-change` custom DOM event when the style is updated
- Ships as an ES module, ready for use with modern bundlers

## Usage

### Register the custom element

Import the registration module once in your application entry point:

```js
import '@geostyler/web-component/geostyler-web-component';
```

### Use the element in your template

```html
<geostyler-style-wc id="styler"></geostyler-style-wc>
```

### Pass data and style via JavaScript

The component accepts two JSON attributes/properties:

| Property          | Type                      | Description                                      |
|-------------------|---------------------------|--------------------------------------------------|
| `geostylerStyle`  | `GeoStyler Style` (JSON)  | The initial cartographic style to display/edit.  |
| `data`            | `GeoJSONFeatureCollection`| GeoJSON data used for attribute-based symbolizers.|

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

### Listen for style changes

When the user edits the style, a `style-change` CustomEvent is dispatched on the element:

```js
styler.addEventListener('style-change', (event) => {
  console.log('Updated style:', event.detail);
});
```

### Angular example

```ts
// app.component.ts
import '@geostyler/web-component/geostyler-web-component';
```

```html
<!-- app.component.html -->
<geostyler-style-wc
  #styler
  (style-change)="onStyleChange($event)">
</geostyler-style-wc>
```

```ts
// In your component class
onStyleChange(event: CustomEvent) {
  this.currentStyle = event.detail;
}
```

> In Angular, add `CUSTOM_ELEMENTS_SCHEMA` to the module/component schemas to suppress unknown-element warnings.

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
2. `GeostylerWebComponent.tsx` uses `@r2wc/react-to-web-component` to mount the React `<Style>` component inside a Shadow DOM-compatible custom element.
3. GeoJSON data is parsed with `geostyler-geojson-parser` and provided to GeoStyler via `GeoStylerContext`.
4. Style changes bubble up as a standard `style-change` DOM event.
