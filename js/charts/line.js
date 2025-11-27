// js/charts/line.js — Unified line chart (multi-series + optional gap/bands + per-series markers)
import { d3 } from '../deps.js';
import { createSVG } from '../core/utils.js';
import { animOpts, revealWithAnim } from './base.js';

/**
 * Usage patterns:
 *
 * 1) Single series (back-compat):
 *    { data:[{x,y}], xKey:'x', yKey:'y', showArea, marker:{show:true}, axes:{...}, styles:{...} }
 *
 * 2) Multiple series (+ optional bands/gap):
 *    {
 *      series: [
 *        { id:'A', data:[{x,y}], styles:{stroke, strokeWidth, dasharray}, marker:{show:true, r, fill} },
 *        { id:'B', data:[{x,y}], ... }
 *      ],
 *      bands: [ { top:'A', bottom:'B', fill:'rgba(...)', opacity:0.18 } ], // shade between A & B
 *      axes: { xTicks, yTicks, xFormat, yFormat, grid:true, xLabel, yLabel },
 *      curve: 'MonotoneX' | 'Linear' | ...,
 *      xScale: 'linear'|'time'|'log',
 *      yScale: 'linear'|'log',
 *      width, height, margin:{t,r,b,l},
 *      anim: { fadeMs, drawMs, delayMs, ease, threshold }
 *    }
 */
export function build(sel, props = {}){
  const W = props.width ?? 1200;
  const H = props.height ?? 600;
  const M = Object.assign({ t:40, r:40, b:72, l:82 }, props.margin || {});
  const svg = createSVG(sel, W, H);
  const g = svg.append('g').attr('transform', `translate(${M.l},${M.t})`); // globally faded

  const innerW = W - M.l - M.r, innerH = H - M.t - M.b;

  // Normalize "series" inputs (support old {data} form).
  let series = props.series;
  if (!Array.isArray(series)) {
    const data = props.data || props.points || [];
    const xKey = props.xKey || 'x', yKey = props.yKey || 'y';
    series = [{ id: 's0', data, xKey, yKey, styles: props.styles, marker: props.marker, showArea: props.showArea, areaOpacity: props.areaOpacity }];
  }
  // Ensure keys per series
  series.forEach((s, i) => {
    s.id = s.id ?? `s${i}`;
    s.xKey = s.xKey || props.xKey || 'x';
    s.yKey = s.yKey || props.yKey || 'y';
    s.styles = Object.assign({ strokeWidth: 3 }, s.styles || {});
    s.marker = Object.assign({ show: false, r: 5 }, s.marker || {});
  });

  // Scales
  const allX = series.flatMap(s => s.data.map(d => d[s.xKey]));
  const allY = series.flatMap(s => s.data.map(d => d[s.yKey]));
  const xType = (props.xScale || 'linear').toLowerCase();
  const yType = (props.yScale || 'linear').toLowerCase();

  const x = (xType === 'time' ? d3.scaleUtc() : xType === 'log' ? d3.scaleLog() : d3.scaleLinear())
    .domain(d3.extent(allX))
    .range([0, innerW]);

  const yMax = d3.max(allY) ?? 1;
  const y = (yType === 'log' ? d3.scaleLog() : d3.scaleLinear())
    .domain([0, yMax * 1.2])
    .nice()
    .range([innerH, 0]);

  // Axes
  const axes = Object.assign({ xTicks: 8, yTicks: 6, grid: true }, props.axes || {});
  const xFmt = axes.xFormat || (xType === 'time' ? d3.utcFormat('%Y') : d3.format('d'));
  const yFmt = axes.yFormat || d3.format('.2s');

  const gx = g.append('g').attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(axes.xTicks).tickFormat(xFmt).tickSize(axes.grid ? -innerH : 6));
  gx.selectAll('text').attr('fill', 'var(--muted)');
  gx.selectAll('line,path').attr('stroke', 'var(--gridline)');

  const gy = g.append('g')
    .call(d3.axisLeft(y).ticks(axes.yTicks).tickFormat(yFmt).tickSize(axes.grid ? -innerW : 6));
  gy.selectAll('text').attr('fill', 'var(--muted)');
  gy.selectAll('line,path').attr('stroke', 'var(--gridline)');

  if (axes.xLabel) {
    g.append('text')
      .attr('class','axis-title')
      .attr('x', innerW/2)
      .attr('y', innerH + 56)
      .attr('text-anchor','middle')
      .text(axes.xLabel);
  }
  if (axes.yLabel) {
    g.append('text')
      .attr('class','axis-title')
      .attr('transform', `translate(${-54},${innerH/2}) rotate(-90)`)
      .attr('text-anchor','middle')
      .text(axes.yLabel);
  }

  // Curves
  const curveFactory = d3[`curve${props.curve || 'MonotoneX'}`] || d3.curveMonotoneX;
  const lineGen = d3.line().curve(curveFactory);

  // Optional bands/gaps (shade between two series)
  const bands = Array.isArray(props.bands) ? props.bands : [];
  const bandPaths = [];

  function seriesByRef(ref){
    if (typeof ref === 'number') return series[ref];
    return series.find(s => s.id === ref) || series[0];
  }

  for (const band of bands) {
    const topS = seriesByRef(band.top);
    const botS = seriesByRef(band.bottom);
    if (!topS || !botS) continue;

    const xKey = topS.xKey, yTop = topS.yKey, yBot = botS.yKey;
    const botByX = new Map(botS.data.map(d => [d[xKey], d[yBot]]));

    const areaGen = d3.area()
      .curve(curveFactory)
      .x(d => x(d[xKey]))
      .y0(d => y(botByX.get(d[xKey]) ?? 0))
      .y1(d => y(d[yTop]));

    const p = g.append('path')
      .datum(topS.data)
      .attr('d', areaGen)
      .attr('fill', band.fill || 'var(--accent)')
      .attr('opacity', band.opacity ?? 0.18)
      .style('opacity', 0); // will fade in on reveal
    bandPaths.push(p);
  }

  // Lines + optional per-series area + marker-follow animation
  const lineNodes = [];
  const markers = [];

  series.forEach((s) => {
    const { xKey, yKey, styles, marker, showArea, areaOpacity } = s;

    // Optional simple area under a series
    if (showArea) {
      const area = d3.area().curve(curveFactory)
        .x(d => x(d[xKey]))
        .y0(innerH)
        .y1(d => y(d[yKey]));
      g.append('path')
        .datum(s.data)
        .attr('fill', styles.areaFill || 'var(--accent)')
        .style('opacity', areaOpacity ?? 0.15)
        .attr('d', area);
    }

    const path = g.append('path')
      .datum(s.data)
      .attr('fill','none')
      .attr('stroke', styles.stroke || 'var(--accent)')
      .attr('stroke-width', styles.strokeWidth)
      .attr('stroke-dasharray', styles.dasharray || null)
      .attr('d', lineGen.x(d => x(d[xKey])).y(d => y(d[yKey])));

    // Set up stroke-draw animation
    const L = path.node().getTotalLength();
    path.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L);

    // Marker that follows the stroke (optional)
    let mk = null;
    if (marker.show) {
      const p0 = path.node().getPointAtLength(0);
      mk = g.append('circle')
        .attr('r', marker.r ?? 5)
        .attr('fill', marker.fill || styles.stroke || 'var(--accent)')
        .style('opacity', 0)
        .attr('cx', p0.x).attr('cy', p0.y);
    }

    lineNodes.push({ path, L, marker: mk });
  });

  const A = animOpts(props, { drawMs: 2200, fadeMs: 700 });

  revealWithAnim(sel, g, props, () => {
    // Fade bands after a short delay for clarity
    bandPaths.forEach((p,i) => p.transition().delay((props.anim?.bandDelayMs ?? 500) + i*60).duration(props.anim?.bandMs ?? 1200).style('opacity', 1));

    // Draw lines + move markers
    lineNodes.forEach(({ path, L, marker }, i) => {
      path.transition()
        .delay(props.anim?.lineDelayMs ?? 0)
        .duration(A.drawMs)
        .ease(A.ease)
        .attr('stroke-dashoffset', 0)
        .on('start', () => { if (marker) marker.style('opacity', 1); })
        .tween(`marker-follow-${i}`, function(){
          if (!marker) return () => {};
          const node = this;
          return function(t){
            const p = node.getPointAtLength(L * t);
            marker.attr('cx', p.x).attr('cy', p.y);
          };
        });
    });
  });

  // Simple legend under the chart (optional)
  if (props.legend !== false){
    const legendG = svg.append('g').attr('class','line-legend');
    const items = series.map(s => ({
      id: s.id,
      color: s.styles?.stroke || 'var(--accent)'
    }));
    const entryH = 18;
    legendG.selectAll('g.item').data(items).join('g')
      .attr('class','item')
      .attr('transform',(d,i)=>`translate(${M.l},${H - M.b + 18 + i*entryH})`)
      .each(function(d){
        const row = d3.select(this);
        row.append('rect').attr('width',18).attr('height',6).attr('y',-7).attr('fill', d.color);
        row.append('text')
          .attr('x',26).attr('y',0)
          .attr('fill','var(--muted)')
          .attr('font-size','12px')
          .attr('dominant-baseline','middle')
          .text(d.id);
      });
  }
}
