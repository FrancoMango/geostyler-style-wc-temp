import { GeoJSONFeatureCollection } from 'ol/format/GeoJSON';

import r2wc from '@r2wc/react-to-web-component';
import {
  GeoStylerContext,
  GeoStylerContextInterface,
  Style,
  locale as gsLocale
} from 'geostyler';
import { Data } from 'geostyler-data';
import { GeoJsonDataParser } from 'geostyler-geojson-parser';
import { Style as GsStyle } from 'geostyler-style';
import { StyleProps } from 'geostyler/dist/Component/Style/Style';
import React, { useCallback, useEffect, useMemo } from 'react';

function isGsStyle(val: unknown): val is GsStyle {
  return (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as GsStyle).name === 'string' &&
    Array.isArray((val as GsStyle).rules)
  );
}

function isGeoJsonFeatureCollection(
  val: unknown
): val is GeoJSONFeatureCollection {
  return (
    typeof val === 'object' &&
    val !== null &&
    (val as { type?: unknown }).type === 'FeatureCollection' &&
    Array.isArray((val as { features?: unknown }).features)
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

  const [validationError, setValidationError] = React.useState<
    Error | undefined
  >();
  const [parsedData, setParsedData] = React.useState<Data | undefined>(
    undefined
  );

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
    if (!data) {
      setParsedData(undefined);
      setValidationError(undefined);
      return;
    }

    if (!isGeoJsonFeatureCollection(data)) {
      setParsedData(undefined);
      setValidationError(
        new Error('data prop is not a valid GeoJSON FeatureCollection')
      );
      return;
    }

    setValidationError(undefined);

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
  }, [data, geoJsonParser]);

  useEffect(() => {
    if (!validationError) return;

    container?.dispatchEvent(
      new CustomEvent('parse-error', {
        detail: validationError,
        bubbles: true,
        composed: true
      })
    );
  }, [container, validationError]);

  if (!isGsStyle(geostylerStyle)) {
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
