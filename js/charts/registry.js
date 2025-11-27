// js/charts/registry.js — central registry + adapters for backward compatibility
import { register, getChart } from './registry_core.js';

// Unified geo chart
import { build as Geo } from './geo.js';

// Existing charts (non-geo, unchanged)
import { build as Line } from './line.js';
import { build as Timeline } from './timeline.js';
import { build as Ridge } from './ridge.js';
import { build as Sankey } from './sankey.js';
import { build as Chord } from './chord.js';
import { build as Table } from './table.js';
import { build as Heatmap } from './heatmap.js';
import { build as Hist } from './hist.js';
import { build as Scatter } from './scatter.js';
import { build as Text } from './text.js';
import { build as Cards } from './cards.js';
import { build as Credits } from './credits.js';
import { build as Video } from './video.js';
import { build as Logos } from './logos.js';

// Canonical registrations
register('geo', Geo);
register('line', Line);
register('timeline', Timeline);
register('ridge', Ridge);
register('sankey', Sankey);
register('chord', Chord);
register('table', Table);
register('heatmap', Heatmap);
register('hist', Hist);
register('scatter', Scatter);
register('text', Text);
register('cards', Cards);
register('credits', Credits);
register('video', Video);
register('logos', Logos);

// Backward-compatibility aliases for geo variants
register('map', Geo);
register('bubbles', Geo);
register('hexgrid', Geo);
register('flow2d', Geo);
register('plumes', Geo);
register('water', Geo);   // water's choropleth can be expressed via geo.basemap.choropleth

export { getChart };
