import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GeostylerStyleAdapter } from './GeostylerWebComponent';

const mockReadData = vi.fn();
const mockedStyleFromEditor = { name: 'updated-style', rules: [] };

vi.mock('@r2wc/react-to-web-component', () => {
  return {
    default: () => class MockGeostylerWc extends HTMLElement {}
  };
});

vi.mock('geostyler', () => {
  const Style = ({
    onStyleChange
  }: {
    onStyleChange?: (style: { name: string; rules: unknown[] }) => void;
  }) => {
    useEffect(() => {
      onStyleChange?.(mockedStyleFromEditor);
    }, [onStyleChange]);

    return React.createElement('div', { 'data-testid': 'mock-style' });
  };

  return {
    GeoStylerContext: {
      Provider: ({ children }: { children?: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children)
    },
    Style,
    locale: {
      en_US: { locale: 'en_US' },
      fr_FR: { locale: 'fr_FR' }
    }
  };
});

vi.mock('geostyler-geojson-parser', () => {
  return {
    GeoJsonDataParser: class GeoJsonDataParser {
      readData(data: unknown): Promise<unknown> {
        return mockReadData(data);
      }
    }
  };
});

describe('GeostylerStyleAdapter', () => {
  let mountNode: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    mockReadData.mockReset();
    mockReadData.mockResolvedValue({ parsed: true });

    mountNode = document.createElement('div');
    document.body.appendChild(mountNode);
    root = createRoot(mountNode);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    mountNode.remove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('emits parse-error when geostylerStyle has invalid shape', async () => {
    const container = document.createElement('div');
    const parseErrorHandler = vi.fn();
    container.addEventListener('gs-parse-error', parseErrorHandler);

    await act(async () => {
      root.render(
        React.createElement(GeostylerStyleAdapter, {
          container,
          data: null,
          geostylerStyle: { invalid: true }
        })
      );
    });

    expect(parseErrorHandler).toHaveBeenCalledTimes(1);
    const event = parseErrorHandler.mock.calls[0][0] as CustomEvent<Error>;
    expect(event.detail).toBeInstanceOf(Error);
    expect(event.detail.message).toContain(
      'geostylerStyle prop has an invalid shape'
    );
  });

  it('emits warning when locale is unsupported', async () => {
    const container = document.createElement('div');
    const warningHandler = vi.fn();
    container.addEventListener('gs-warning', warningHandler);

    await act(async () => {
      root.render(
        React.createElement(GeostylerStyleAdapter, {
          container,
          data: null,
          locale: 'xx_YY' as never,
          geostylerStyle: { name: 'base-style', rules: [] }
        })
      );
    });

    expect(warningHandler).toHaveBeenCalledTimes(1);
    const event = warningHandler.mock.calls[0][0] as CustomEvent<string>;
    expect(event.detail).toContain('Locale "xx_YY" is not supported');
  });

  it('emits parsing true/false around GeoJSON parsing', async () => {
    const container = document.createElement('div');
    const parsingStates: boolean[] = [];
    container.addEventListener('gs-parsing', (event) => {
      parsingStates.push((event as CustomEvent<boolean>).detail);
    });

    const data = {
      type: 'FeatureCollection' as const,
      features: []
    };

    await act(async () => {
      root.render(
        React.createElement(GeostylerStyleAdapter, {
          container,
          data,
          geostylerStyle: { name: 'base-style', rules: [] }
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(parsingStates).toContain(true);
    expect(parsingStates.at(-1)).toBe(false);
  });

  it('cancels pending debounced style-change on unmount', async () => {
    const container = document.createElement('div');
    const styleChangeHandler = vi.fn();
    container.addEventListener('gs-style-change', styleChangeHandler);

    await act(async () => {
      root.render(
        React.createElement(GeostylerStyleAdapter, {
          container,
          data: null,
          debounceMs: 50,
          geostylerStyle: { name: 'base-style', rules: [] }
        })
      );
    });

    act(() => {
      root.unmount();
      vi.advanceTimersByTime(100);
    });

    expect(styleChangeHandler).toHaveBeenCalledTimes(0);
  });

  it('emits gs-style-change immediately when not debounced', async () => {
    const container = document.createElement('div');
    const styleChangeHandler = vi.fn();
    container.addEventListener('gs-style-change', styleChangeHandler);

    await act(async () => {
      root.render(
        React.createElement(GeostylerStyleAdapter, {
          container,
          data: null,
          geostylerStyle: { name: 'base-style', rules: [] }
        })
      );
    });

    expect(styleChangeHandler).toHaveBeenCalledTimes(1);
    const event = styleChangeHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual(mockedStyleFromEditor);
  });

  it('emits gs-style-change once after the debounce delay elapses', async () => {
    const container = document.createElement('div');
    const styleChangeHandler = vi.fn();
    container.addEventListener('gs-style-change', styleChangeHandler);

    await act(async () => {
      root.render(
        React.createElement(GeostylerStyleAdapter, {
          container,
          data: null,
          debounceMs: 50,
          geostylerStyle: { name: 'base-style', rules: [] }
        })
      );
    });

    expect(styleChangeHandler).toHaveBeenCalledTimes(0);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(styleChangeHandler).toHaveBeenCalledTimes(1);
    const event = styleChangeHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual(mockedStyleFromEditor);
  });

  it('emits gs-parse-error when GeoJSON data cannot be parsed', async () => {
    mockReadData.mockReset();
    mockReadData.mockRejectedValue(new Error('bad geojson'));

    const container = document.createElement('div');
    const parseErrorHandler = vi.fn();
    container.addEventListener('gs-parse-error', parseErrorHandler);

    const data = {
      type: 'FeatureCollection' as const,
      features: []
    };

    await act(async () => {
      root.render(
        React.createElement(GeostylerStyleAdapter, {
          container,
          data,
          geostylerStyle: { name: 'base-style', rules: [] }
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(parseErrorHandler).toHaveBeenCalledTimes(1);
    const event = parseErrorHandler.mock.calls[0][0] as CustomEvent<Error>;
    expect(event.detail).toBeInstanceOf(Error);
    expect(event.detail.message).toContain('bad geojson');
  });

  it('parses valid data without emitting gs-parse-error', async () => {
    const container = document.createElement('div');
    const parseErrorHandler = vi.fn();
    const parsingStates: boolean[] = [];
    container.addEventListener('gs-parse-error', parseErrorHandler);
    container.addEventListener('gs-parsing', (event) => {
      parsingStates.push((event as CustomEvent<boolean>).detail);
    });

    const data = {
      type: 'FeatureCollection' as const,
      features: []
    };

    await act(async () => {
      root.render(
        React.createElement(GeostylerStyleAdapter, {
          container,
          data,
          geostylerStyle: { name: 'base-style', rules: [] }
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReadData).toHaveBeenCalledWith(data);
    expect(parseErrorHandler).toHaveBeenCalledTimes(0);
    expect(parsingStates.at(-1)).toBe(false);
  });
});
