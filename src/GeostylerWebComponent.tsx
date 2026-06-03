import { GeoJSONFeatureCollection } from 'ol/format/GeoJSON';

import r2wc from '@r2wc/react-to-web-component';
import { GeoStylerContext, GeoStylerContextInterface, Style, locale as gsLocale } from 'geostyler';
import { StyleProps } from 'geostyler/dist/Component/Style/Style';
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

interface GeostylerStyleAdapterProps {
  container?: HTMLElement;
  // Context props
  data: GeoJSONFeatureCollection;
  locale?: keyof typeof gsLocale;
  composition?: GeoStylerContextInterface['composition'];
  unsupportedProperties?: GeoStylerContextInterface['unsupportedProperties'];
  // Style props
  geostylerStyle: GsStyle;
  nameField?: StyleProps['nameField'];
  disableClassification?: StyleProps['disableClassification'];
  disableMultiEdit?: StyleProps['disableMultiEdit'];
}

const GeostylerStyleAdapter: React.FC<GeostylerStyleAdapterProps> = ({
  container,
  data,
  locale,
  composition,
  unsupportedProperties,
  geostylerStyle,
  nameField,
  disableClassification,
  disableMultiEdit
}) => {
  const activeLocale =
    gsLocale[locale as keyof typeof gsLocale] ?? gsLocale.en_US;

  const geoJsonParser = useMemo(() => new GeoJsonDataParser(), []);

  const [parsedData, setParsedData] = React.useState<Data | undefined>(undefined);

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
      value={{
        data: parsedData,
        locale: activeLocale,
        unsupportedProperties,
        composition
      }}
    >
      <Style
        style={geostylerStyle}
        onStyleChange={emitStyleChange}
        nameField={nameField}
        disableClassification={disableClassification}
        disableMultiEdit={disableMultiEdit}
      />
    </GeoStylerContext.Provider>
  );
};

export const GeostylerWebComponent = r2wc(GeostylerStyleAdapter, {
  props: {
    geostylerStyle: 'json',
    data: 'json',
    locale: 'string',
    composition: 'json',
    unsupportedProperties: 'json',
    nameField: 'json',
    disableClassification: 'boolean',
    disableMultiEdit: 'boolean'
  }
});
