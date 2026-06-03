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
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

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

function toError(error: unknown, fallbackMessage: string): Error {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

function ErrorFallback({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        boxSizing: 'border-box',
        padding: '12px 16px',
        border: '1px solid #d32f2f',
        borderRadius: '8px',
        background: '#fff5f5',
        color: '#7f1d1d',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        lineHeight: 1.4
      }}
    >
      <strong style={{ display: 'block', marginBottom: '4px' }}>
        GeoStyler editor failed to load
      </strong>
      <span>{message}</span>
    </div>
  );
}

interface GeostylerStyleAdapterProps {
  container?: HTMLElement;
  // Context props
  data: unknown;
  locale?: keyof typeof gsLocale;
  composition?: GeoStylerContextInterface['composition'];
  unsupportedProperties?: GeoStylerContextInterface['unsupportedProperties'];
  // Style props
  geostylerStyle: unknown;
  nameField?: StyleProps['nameField'];
  disableClassification?: StyleProps['disableClassification'];
  disableMultiEdit?: StyleProps['disableMultiEdit'];
  debounceMs?: number;
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
  disableMultiEdit,
  debounceMs = 0
}) => {
  const activeLocale =
    gsLocale[locale as keyof typeof gsLocale] ?? gsLocale.en_US;

  const geoJsonParser = useMemo(() => new GeoJsonDataParser(), []);

  const styleValidationError = useMemo(() => {
    if (geostylerStyle == null || isGsStyle(geostylerStyle)) {
      return undefined;
    }

    return new Error('geostylerStyle prop has an invalid shape');
  }, [geostylerStyle]);

  const [dataValidationError, setDataValidationError] = React.useState<
    Error | undefined
  >();
  const [parsedData, setParsedData] = React.useState<Data | undefined>(
    undefined
  );
  const [isParsing, setIsParsing] = React.useState(false);

  const validationError = styleValidationError ?? dataValidationError;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const emitStyleChange = useCallback(
    (newStyle: GsStyle) => {
      const dispatch = () =>
        container?.dispatchEvent(
          new CustomEvent('style-change', {
            detail: newStyle,
            bubbles: true,
            composed: true
          })
        );

      if (debounceMs <= 0) {
        dispatch();
        return;
      }

      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(dispatch, debounceMs);
    },
    [container, debounceMs]
  );

  useEffect(() => {
    if (!data) {
      setParsedData(undefined);
      setDataValidationError(undefined);
      setIsParsing(false);
      return;
    }

    if (!isGeoJsonFeatureCollection(data)) {
      setParsedData(undefined);
      setDataValidationError(
        new Error('data prop is not a valid GeoJSON FeatureCollection')
      );
      setIsParsing(false);
      return;
    }

    setDataValidationError(undefined);
    setIsParsing(true);

    let active = true;

    geoJsonParser
      .readData(data)
      .then((gsData) => {
        if (active) {
          setParsedData(gsData);
          setIsParsing(false);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setParsedData(undefined);
        setDataValidationError(toError(error, 'data prop could not be parsed'));
        setIsParsing(false);
      });

    return () => {
      active = false;
    };
  }, [data, geoJsonParser]);

  useEffect(() => {
    container?.dispatchEvent(
      new CustomEvent('parsing', {
        detail: isParsing,
        bubbles: true,
        composed: true
      })
    );
  }, [container, isParsing]);

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

  if (geostylerStyle == null || validationError) {
    if (validationError) {
      return <ErrorFallback message={validationError.message} />;
    }

    return null;
  }

  if (!isGsStyle(geostylerStyle)) {
    return null;
  }

  const validGeostylerStyle = geostylerStyle;

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
        style={validGeostylerStyle}
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
    disableMultiEdit: 'boolean',
    debounceMs: 'number'
  }
});
