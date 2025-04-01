import 'maplibre-gl/dist/maplibre-gl.css';
declare global {
    interface Window {
        city: any;
    }
}
export type simpleStyle = {
    'fill'?: string;
    'stroke'?: string;
    'marker-color'?: string;
    'stroke-width': number;
    'marker-symbol'?: string;
    'marker-size'?: number;
};
