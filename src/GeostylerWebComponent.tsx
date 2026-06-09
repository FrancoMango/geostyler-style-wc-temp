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
import React, {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef
} from 'react';

import {
  GS_PARSE_ERROR,
  GS_PARSING,
  GS_STYLE_CHANGE,
  GS_WARNING
} from './constants';

type GeoJSONFeatureCollectionLike = {
  type: 'FeatureCollection';
  features: unknown[];
};

type StyleComponentProps = ComponentProps<typeof Style>;

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
): val is GeoJSONFeatureCollectionLike {
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

interface GeostylerStyleAdapterProps {
  // Adapter props
  container?: HTMLElement;
  debounceMs?: number;
  // Context props
  data: unknown;
  locale?: keyof typeof gsLocale;
  composition?: GeoStylerContextInterface['composition'];
  unsupportedProperties?: GeoStylerContextInterface['unsupportedProperties'];
  // Style props
  geostylerStyle?: unknown;
  nameField?: StyleComponentProps['nameField'];
  disableClassification?: StyleComponentProps['disableClassification'];
  disableMultiEdit?: StyleComponentProps['disableMultiEdit'];
}

export const GeostylerStyleAdapter: React.FC<GeostylerStyleAdapterProps> = ({
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
  const localeResolved = locale != null && locale in gsLocale;
  const activeLocale = localeResolved
    ? gsLocale[locale as keyof typeof gsLocale]
    : gsLocale.en_US;

  const geoJsonParser = useMemo(() => new GeoJsonDataParser(), []);

  const dispatchCustomEvent = useCallback(
    (type: string, detail: unknown) => {
      container?.dispatchEvent(
        new CustomEvent(type, {
          detail,
          bubbles: true,
          composed: true
        })
      );
    },
    [container]
  );

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
      const dispatch = () => dispatchCustomEvent(GS_STYLE_CHANGE, newStyle);

      if (debounceMs <= 0) {
        dispatch();
        return;
      }

      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(dispatch, debounceMs);
    },
    [debounceMs, dispatchCustomEvent]
  );

  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current);
    };
  }, []);

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
    dispatchCustomEvent(GS_PARSING, isParsing);
  }, [dispatchCustomEvent, isParsing]);

  useEffect(() => {
    if (locale == null || localeResolved) return;

    dispatchCustomEvent(
      GS_WARNING,
      `Locale "${locale}" is not supported. Falling back to "en_US".`
    );
  }, [dispatchCustomEvent, locale, localeResolved]);

  useEffect(() => {
    if (!validationError) return;

    dispatchCustomEvent(GS_PARSE_ERROR, validationError);
  }, [dispatchCustomEvent, validationError]);

  if (geostylerStyle == null || validationError) {
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
