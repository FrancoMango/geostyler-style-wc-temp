import { GeoJSONFeatureCollection } from 'ol/format/GeoJSON';

import r2wc from '@r2wc/react-to-web-component';
import { GeoStylerContext, Style, locale as gsLocale } from 'geostyler';
import { Data } from 'geostyler-data';
import { GeoJsonDataParser } from 'geostyler-geojson-parser';
import { Style as GsStyle } from 'geostyler-style';
import React, { useCallback, useEffect, useMemo } from 'react';

function isGsStyle(val: unknown): val is GsStyle {
  return (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as GsStyle).name === 'string' &&
    Array.isArray((val as GsStyle).rules)
  );
}

const GeostylerStyleAdapter: React.FC<{
  container?: HTMLElement;
  data: GeoJSONFeatureCollection;
  geostylerStyle: GsStyle;
  locale?: keyof typeof gsLocale;
}> = ({ container, data, geostylerStyle, locale }) => {
  const activeLocale =
    locale && locale in gsLocale
      ? gsLocale[locale as keyof typeof gsLocale]
      : gsLocale.en_US;

  const geoJsonParser = useMemo(() => new GeoJsonDataParser(), []);

  const [parsedData, setParsedData] = React.useState<Data | null>(null);

  const emitStyleChange = useCallback(
    (newStyle: GsStyle) => {
      container?.dispatchEvent(
        new CustomEvent('style-change', {
          detail: newStyle,
          bubbles: true,
          composed: true
        })
      );
    },
    [container]
  );

  useEffect(() => {
    if (!data) return;

    geoJsonParser
      .readData(data)
      .then((gsData) => setParsedData(gsData))
      .catch((error) => {
        container?.dispatchEvent(
          new CustomEvent('parse-error', {
            detail: error,
            bubbles: true,
            composed: true
          })
        );
      });
  }, [data]);

  if (!isGsStyle(geostylerStyle)) {
    if (geostylerStyle != null) {
      container?.dispatchEvent(
        new CustomEvent('parse-error', {
          detail: new Error('geostylerStyle prop has an invalid shape'),
          bubbles: true,
          composed: true
        })
      );
    }
    return null;
  }

  return (
    <GeoStylerContext.Provider
      value={{ data: parsedData, locale: activeLocale }}
    >
      <Style style={geostylerStyle} onStyleChange={emitStyleChange} />
    </GeoStylerContext.Provider>
  );
};

export const GeostylerWebComponent = r2wc(GeostylerStyleAdapter, {
  props: { geostylerStyle: 'json', data: 'json', locale: 'string' }
});
