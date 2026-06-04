import { GeostylerWebComponent } from './GeostylerWebComponent.js';

const GEOSTYLER_WEB_COMPONENT_TAG = 'geostyler-style-wc';

export function registerGeostylerWebComponent(
  registry: CustomElementRegistry | undefined = globalThis.customElements
): boolean {
  if (!registry) {
    return false;
  }

  if (registry.get(GEOSTYLER_WEB_COMPONENT_TAG)) {
    return false;
  }

  registry.define(GEOSTYLER_WEB_COMPONENT_TAG, GeostylerWebComponent);
  return true;
}

registerGeostylerWebComponent();
