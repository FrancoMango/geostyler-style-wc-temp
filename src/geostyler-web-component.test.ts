import { describe, expect, it, vi } from 'vitest';

import { registerGeostylerWebComponent } from './geostyler-web-component';

vi.mock('./GeostylerWebComponent.js', () => {
  return {
    GeostylerWebComponent: class MockGeostylerWebComponent extends HTMLElement {}
  };
});

describe('registerGeostylerWebComponent', () => {
  it('returns false when no registry is available', () => {
    expect(registerGeostylerWebComponent(undefined)).toBe(false);
  });

  it('defines the element and returns true when tag is missing', () => {
    const define = vi.fn();
    const get = vi.fn().mockReturnValue(undefined);

    const registry = {
      get,
      define
    } as unknown as CustomElementRegistry;

    const registered = registerGeostylerWebComponent(registry);

    expect(registered).toBe(true);
    expect(get).toHaveBeenCalledWith('geostyler-style-wc');
    expect(define).toHaveBeenCalledTimes(1);
    expect(define).toHaveBeenCalledWith(
      'geostyler-style-wc',
      expect.any(Function)
    );
  });

  it('returns false when the element is already defined', () => {
    const define = vi.fn();
    const get = vi.fn().mockReturnValue(function ExistingElement() {
      return undefined;
    });

    const registry = {
      get,
      define
    } as unknown as CustomElementRegistry;

    const registered = registerGeostylerWebComponent(registry);

    expect(registered).toBe(false);
    expect(define).not.toHaveBeenCalled();
  });
});
