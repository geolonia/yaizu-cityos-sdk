import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Papa from 'papaparse';
import { parseApiKey } from './utils';

import style from './style.json'

declare global {
  interface Window {
    city: any;
  }
}

const LAYER_TYPES = {
  point: 'Point',
  line: 'LineString',
  polygon: 'Polygon',
  polygonOutline: 'Polygon-outline',
  symbol: 'Symbol',
  label: 'Label',
};

export type simpleStyle = { 
  'fill'?: string;
  'stroke'?: string, 
  'marker-color'?: string, 
  'stroke-width': number,
  'marker-symbol'?: string,
  'marker-size'?: number
}

class YaizuMap extends maplibregl.Map {

  constructor(params: any) {

    const defaults = {
      container: 'map',
      style: style,
      center: [138.29294, 34.84363],
      zoom: 12,
      transformRequest: (url: string, resourceType: string) => {
        if (!window.city.apiKey) { return { url }; }

        if ((resourceType === 'Tile' || resourceType === 'Source') && url.startsWith('https://tileserver.geolonia.com')) {
          const updatedUrl = url.replace('YOUR-API-KEY', window.city.apiKey);
          return { url: updatedUrl };
        }

        return { url };
      }
    }

    super({...defaults, ...params});
  }

  /* **************
   * データのロード
   * **************/ 
  loadData(className: string, options?: simpleStyle) {
    Object.keys(LAYER_TYPES).forEach((layerType) => {
      const typedKey = layerType as keyof typeof LAYER_TYPES;
      const layerId = `${className}-${LAYER_TYPES[typedKey]}`;

      if (!this.getLayer(layerId)) { return; }
      if (options) {
        Object.entries(options).forEach(([prop, value]) => {
          if (!value) { return; }
          const mappedProp = this.convertStyleProp(typedKey, prop);
          if(!mappedProp) { return; }
          this.setPaintProperty(layerId, mappedProp, value);
        });
      }
      this.setLayoutProperty(layerId, 'visibility', 'visible');
    });
  }

  /* **************
   * シンプルスタイルを変換
   * **************/ 
  private convertStyleProp(geometryType: keyof typeof LAYER_TYPES, prop: string): string | undefined {
    // "stroke" に対する処理
    if (prop === 'stroke') {
      if (geometryType === 'point') {
        return 'circle-stroke-color';
      } else if (geometryType === 'line') {
        return 'line-color';
      } else if (geometryType === 'polygon' || geometryType === 'polygonOutline') {
        return 'fill-outline-color';
      }
      return undefined;
    }
  
    // "stroke-width" に対する処理
    if (prop === 'stroke-width') {
      if (geometryType === 'point') {
        return 'circle-stroke-width';
      } else if (geometryType === 'line') {
        return 'line-width';
      } else if (geometryType === 'polygon' || geometryType === 'polygonOutline') {
        return 'fill-outline-width';
      }
      return undefined;
    }
  
    // その他のプロパティの変換
    const mapping: Record<string, { mapped: string, layers: (keyof typeof LAYER_TYPES)[] }> = {
      'fill':         { mapped: 'fill-color',    layers: ['polygon'] },
      'marker-color': { mapped: 'icon-color',    layers: ['point'] },
      'marker-symbol':{ mapped: 'icon-symbol',   layers: ['symbol'] },
      'marker-size':  { mapped: 'icon-size',     layers: ['symbol'] }
    };
    
    const entry = mapping[prop];
    if (entry && entry.layers.includes(geometryType)) {
      return entry.mapped;
    }
    return undefined;
  }

  /* **************
   * pointデータのcsvをロード
   * **************/ 
  async loadPointCSV(url: string, layerName: string, color?: string) {
    // Fetch the csv from the url
    const res = await fetch(url);
    const csv = await res.text();

    const data = Papa.parse(csv, {header: true}).data

    // Convert the data to geojson use `緯度` as latitude and `経度` as longitude
    const geojson = {
      type: 'FeatureCollection',
      features: data.map((d: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [d.経度, d.緯度]
        },
        properties: d
      }))
    } as GeoJSON.FeatureCollection;

    this.addSource(url, {
      type: 'geojson',
      data: geojson,
    })

    // Add the geojson as layer to the map
    this.addLayer({
      id: layerName,
      type: 'circle',
      source: url,
      paint: {
        'circle-radius': 9,
        'circle-color': color || '#4169e1',
        'circle-opacity': 0.5,
      }
    }, 'poi');

    this.addLayer(    {
      "id": `symbol-${url}`,
      "type": "symbol",
      "source": url,
      "layout": {
        'text-field': "{名称}",
        "text-font": ["NotoSansJP-Regular"],
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.5,
        'text-justify': 'auto',
        'text-size': 12,
        'text-anchor': 'top',
        'text-max-width': 12,
        'text-allow-overlap': false,
      },
      "paint": {
        "text-color": "#333",
        "text-halo-width": 1.2,
        "text-halo-color": "rgba(255,255,255,0.8)"
      }
    })
  }
}

const currentScript = document.currentScript as HTMLScriptElement;

window.city = {}
window.city.apiKey = parseApiKey(currentScript);
window.city.Yaizu = maplibregl
window.city.Yaizu.Map = YaizuMap
window.city.Yaizu.Popup = maplibregl.Popup;
