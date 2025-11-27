// js/charts/geo.js — unified, highly-configurable geo chart
// Supports layers: basemap (incl. choropleth), bubbles, flow arcs, hexgrid, plumes, rings.
// All data & styling are supplied via deck.js props.

import { d3, topojson } from '../deps.js';
import { createSVG, dur, showTip, hideTip, globalReveal } from '../core/utils.js';

const fmtDefault = (v) => {
  if (v == null || isNaN(v)) return '';
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v/1e9).toFixed(1) + 'G';
  if (abs >= 1e6) return (v/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (v/1e3).toFixed(1) + 'k';
  if (abs >= 1) return Number(v).toFixed(0);
  if (v === 0) return '0';
  return v.toFixed(2);
};

const fmtPercent = (v) => {
  if (v == null || isNaN(v)) return '';
  return `${Math.round(v * 100)}%`;
};
import { useJSON } from '../core/geoWarm.js';

/**
 * props:
 *  width, height
 *  projection: 'albers-usa' | function(width,height)->projection  (default 'albers-usa')
 *  basemap: {
 *    url: topojson URL (default us-atlas@3 states-10m),
 *    object: topo object key (default 'states'),
 *    sphereFill, stateFill, stateStroke, stateStrokeWidth,
 *    choropleth?: { valueByName: { [stateName]: number } | (name)=>number, color?: fn | {range:[low,high], domain:[min,max]} }
 *  }
 *  layers: {
 *    bubbles?: {
 *      data: [{lon,lat, ...}],
 *      lon?: 'lon', lat?: 'lat', r?: 'value' (value key), rRange?: [min,max],
 *      style?: { fill, stroke, strokeWidth },
 *      label?: { show?:boolean, text?: fn(d), dy?: fn(d)|number, anchor?: 'middle'|'start'|'end', fontSize?, color?, weight? },
 *      tooltip?: fn(d) -> html,
 *      anim?: { growMs?, ease? }
 *    },
 *    flow?: {
 *      hubs:[{name,lon,lat}], gens:[{name,lon,lat}], edges:[[srcName,tgtName,mag]],
 *      curveBeta?: number (0..1), dashSpeed?: number,
 *      nodeR?: { hub:number, gen:number }, nodeFill?: { hub, gen },
 *      label?: { show?:boolean, fontSize?, color?, weight? },
 *      anim?: { nodeMs? }
 *    },
 *    hexgrid?: {
 *      points:[{lon,lat, value? ...}], valueKey?: string (default 'burden'),
 *      spacing?: number (default 40), hexR?: number (default 14), influence?: number (default 80),
 *      colors?: [low, mid, high],
 *      labelFmt?: fn(p)->string for text labels at original points,
 *      anim?: { drawMs?, waveDelay?: fn(i)->ms }
 *    },
 *    plumes?: {
 *      sites:[{lon,lat, ej, disp, name}],
 *      stroke?: fn|color, stops?: [{offset,color},{offset,color}],
 *      anim?: { growMs?, dashMs? }
 *    },
 *    rings?: { points:[{lon,lat,value?, r?}], stroke?, speed?, rScale? }
 *  }
 *  anim: { fadeMs?, ease?, threshold? }   // global reveal
 */

export async function build(sel, props = {}){
  await topojson;

  const W = props.width ?? 1200, H = props.height ?? 720;
  const svg = createSVG(sel, W, H);
  const defs = svg.append('defs');
  const root = svg.append('g'); // faded in globally

  // --- Projection & path ---
  const projection = (typeof props.projection === 'function')
    ? props.projection(W,H)
    : d3.geoAlbersUsa().fitSize([W,H], {type:'Sphere'});
  const path = d3.geoPath(projection);

  // --- Basemap ---
  const bm = props.basemap || {};
  const mapUrl = bm.url || 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
  const topo = await useJSON(mapUrl);
  const objKey = bm.object || 'states';
  const geo = window.topojson.feature(topo, topo.objects[objKey]);

  // Background sphere + states
  root.append('path').datum({type:'Sphere'}).attr('d', path).attr('fill', bm.sphereFill ?? 'rgba(255,255,255,.0)');
  const states = root.selectAll('path.state').data(geo.features).join('path')
    .attr('class','state')
    .attr('d', path)
    .attr('fill', bm.stateFill ?? 'rgba(255,255,255,.35)')
    .attr('stroke', bm.stateStroke ?? 'rgba(255,255,255,.12)')
    .attr('stroke-width', bm.stateStrokeWidth ?? 0.6);

  let choroplethLegend = null;
  let plumeLegend = null;
  // Optional choropleth
  if (bm.choropleth){
    const vMap = bm.choropleth.valueByName || {};
    const val = (typeof vMap === 'function') ? vMap : (name)=> vMap[name] ?? 0;
    let color;
    if (typeof bm.choropleth.color === 'function'){
      color = bm.choropleth.color;
    }else{
      const range = (bm.choropleth.color && bm.choropleth.color.range) || ['#1f2a44','#ef5d60'];
      const dom = (bm.choropleth.color && bm.choropleth.color.domain) || [0,1];
      color = d3.scaleLinear().domain(dom).range(range);
      choroplethLegend = { scale: color, domain: dom, title: bm.choropleth.legend?.title, format: bm.choropleth.legend?.format };
    }
    // start filled at start color; animate to final
    states.attr('fill', color(0));
    root.node().__animateChoropleth = () => {
      states.transition().duration(dur(900)).attr('fill', d => color(val(d.properties.name)));
    };
  }

  // === Layers ===
  const layers = props.layers || {};
  let bubbleLegend = null;

  // ---- BUBBLES ----
  if (layers.bubbles && Array.isArray(layers.bubbles.data)){
    const L = layers.bubbles;
    const lonK = L.lon || 'lon', latK = L.lat || 'lat', rK = L.r || 'value';
    const r = d3.scaleSqrt()
      .domain([0, d3.max(L.data, d=> +d[rK])])
      .range(L.rRange || [6,36]);
    const nodes = root.append('g').attr('class','bubbles').selectAll('g.m')
      .data(L.data).join('g')
      .attr('class','m')
      .attr('transform', d => {
        const p = projection([+d[lonK], +d[latK]]);
        return p ? `translate(${p})` : null;
      });

    const r0 = d => Math.max(3, r(d[rK]) * 0.25);
    const circles = nodes.append('circle')
      .attr('r', d => r0(d))
      .attr('fill', L.style?.fill ?? 'rgba(247,178,103,.25)')
      .attr('stroke', L.style?.stroke ?? 'rgba(247,157,101,1)')
      .attr('stroke-width', L.style?.strokeWidth ?? 1.6);

    if (L.label?.show !== false){
      const labels = nodes.append('text')
        .attr('y', d => (typeof L.label?.dy === 'function' ? L.label.dy(d, r0(d)) : (L.label?.dy ?? -6)) + (-r0(d)))
        .attr('text-anchor', L.label?.anchor ?? 'middle')
        .attr('fill', L.label?.color ?? 'var(--ink)')
        .attr('font-weight', L.label?.weight ?? 600)
        .attr('font-size', L.label?.fontSize ?? 'var(--fs-geoLabel, 14px)')
        .text(d => L.label?.text ? L.label.text(d) : `${d.name} · ${d[rK]}`);

      // animate labels to final radial offset
      root.node().__animateBubbles = () => {
        circles.transition().duration(dur(L.anim?.growMs ?? 1400)).ease(d3.easeCubicOut)
          .attr('r', d => r(d[rK]));
        labels.transition().duration(dur(1200)).ease(d3.easeCubicOut)
          .attr('y', d => -r(d[rK]) - 6);
      };
    }else{
      root.node().__animateBubbles = () => {
        circles.transition().duration(dur(L.anim?.growMs ?? 1400)).ease(d3.easeCubicOut)
          .attr('r', d => r(d[rK]));
      };
    }

    if (L.legend && Array.isArray(L.legend.values)){
      bubbleLegend = { values: L.legend.values, scale: r, title: L.legend.title };
    }

    // Tooltip (optional)
    if (L.tooltip !== false){
      const pts = L.data;
      svg.on('mousemove',(ev)=>{
        const [mx,my]=d3.pointer(ev);
        const hit=d3.least(pts, d=>{
          const p=projection([+d[lonK],+d[latK]]); if(!p) return 1e9;
          const rr = r(d[rK]);
          return Math.hypot(p[0]-mx,p[1]-my) - rr;
        });
        if(!hit){ hideTip(); return; }
        const p=projection([+hit[lonK],+hit[latK]]);
        const dist=p?Math.hypot(p[0]-mx,p[1]-my):1e9;
        const rr = r(hit[rK]);
        if(dist<rr+10){
          const html = typeof L.tooltip === 'function'
            ? L.tooltip(hit)
            : `<strong>${hit.name}</strong><br/>${(hit[rK]??'').toLocaleString?.() ?? hit[rK]}`;
          showTip(ev.pageX,ev.pageY,html);
        }else{
          hideTip();
        }
      }).on('mouseleave', hideTip);
    }
  }

  // ---- FLOW ARCS ----
  if (layers.flow){
    const F = layers.flow;
    const nodeByName=new Map([...(F.hubs||[]), ...(F.gens||[])].map(n=>[n.name,n]));
    const lineGen=d3.line().curve(d3.curveBundle.beta(F.curveBeta ?? 0.8));
    function arcPoints(a,b,curv=0.22){
      const A=projection([a.lon,a.lat]), B=projection([b.lon,b.lat]);
      if(!A||!B) return null;
      const mx=(A[0]+B[0])/2, my=(A[1]+B[1])/2;
      const dx=B[0]-A[0], dy=B[1]-A[1], nx=-dy, ny=dx;
      const len=Math.hypot(dx,dy); const k=(curv||0.22)*len;
      const C=[mx+nx/len*k, my+ny/len*k];
      return [A,C,B];
    }
    const edgeG = root.append('g').attr('class','flow-edges').attr('fill','none');
    const arcs = (F.edges||[]).map(([sName,tName,mag])=>{
      const s=nodeByName.get(sName), t=nodeByName.get(tName);
      const pts= s && t ? arcPoints(s,t,0.22) : null; if(!pts) return null;
      const color=d3.interpolateWarm(.15+mag*.35);
      const pathEl=edgeG.append('path')
        .attr('d',lineGen(pts))
        .attr('stroke',color)
        .attr('stroke-width',1+mag*4)
        .attr('stroke-opacity',.9)
        .attr('stroke-linecap','round')
        .attr('stroke-dasharray','4 6')
        .attr('stroke-dashoffset',60);
      return {pathEl,mag};
    }).filter(Boolean);

    const nodeG = root.append('g').attr('class','flow-nodes');
    const hubR = F.nodeR?.hub ?? 4.5, genR = F.nodeR?.gen ?? 3.5;
    const hubFill = F.nodeFill?.hub ?? 'var(--brand)', genFill = F.nodeFill?.gen ?? '#fff';

    const gens = nodeG.selectAll('circle.gen').data(F.gens||[]).join('circle')
      .attr('class','gen')
      .attr('cx',d=>projection([d.lon,d.lat])?.[0])
      .attr('cy',d=>projection([d.lon,d.lat])?.[1])
      .attr('r',1)
      .attr('fill',genFill);

    const hubs = nodeG.selectAll('circle.hub').data(F.hubs||[]).join('circle')
      .attr('class','hub')
      .attr('cx',d=>projection([d.lon,d.lat])?.[0])
      .attr('cy',d=>projection([d.lon,d.lat])?.[1])
      .attr('r',1.5)
      .attr('fill',hubFill);

    if (F.label?.show !== false){
      nodeG.selectAll('text.lbl').data([...(F.hubs||[]), ...(F.gens||[])]).join('text')
        .attr('class','lbl')
        .attr('x',d=>projection([d.lon,d.lat])?.[0]+6)
        .attr('y',d=>projection([d.lon,d.lat])?.[1]-6)
        .attr('fill', F.label?.color ?? 'var(--ink)')
        .attr('font-size', F.label?.fontSize ?? 'var(--fs-geoLabel, 12px)')
        .attr('font-weight', F.label?.weight ?? 600)
        .text(d=>d.name);
    }

    let motionTimer = null;
    function startMotion(){
      if(motionTimer) return;
      motionTimer = d3.timer((t)=>{
        const sp = F.dashSpeed ?? 60;
        arcs.forEach(a=>{
          a.pathEl.attr('stroke-dashoffset', 60 - (t/sp)*(1 + a.mag*1.5));
        });
      });
    }
    root.node().__animateFlow = () => {
      gens.transition().duration(dur(F.anim?.nodeMs ?? 600)).attr('r',genR);
      hubs.transition().duration(dur(F.anim?.nodeMs ?? 600)).attr('r',hubR);
      startMotion();
    };
  }

  // ---- HEXGRID ----
  if (layers.hexgrid){
    const Hx = layers.hexgrid;
    const pts=(Hx.points||[]).map(m=>({ ...m, proj: projection([m.lon,m.lat]) }));
    const spacing = Hx.spacing ?? 40;
    const hexR = Hx.hexR ?? 14;
    const cols=Math.ceil(W/spacing)+2, rows=Math.ceil(H/(spacing*0.86))+2;

    const centers=[];
    for(let r=0;r<rows;r++){
      const y=r*spacing*0.86; const xoff=(r%2)*spacing/2;
      for(let c=0;c<cols;c++){ const x=c*spacing + xoff; centers.push({x,y, values:[]}); }
    }
    const influence = Hx.influence ?? 80;
    const vKey = Hx.valueKey || 'burden';
    pts.forEach(p=>{
      centers.forEach(c=>{
        const d=Math.hypot(c.x-p.proj[0], c.y-p.proj[1]);
        if(d<influence) c.values.push(+p[vKey]);
      });
    });
    const v=d=>d.values.length? d3.mean(d.values):0;
    const maxB=d3.max(centers, v)||1;
    const color=d3.scaleLinear()
      .domain([0, maxB*0.5, maxB])
      .range(Hx.colors || ['#20334f','#f7dda6','#ef5d60']);

    const hexPath=(cx,cy,r)=>{
      const a=Math.PI/3;
      const pts=d3.range(6).map(i=>[cx+r*Math.cos(a*i), cy+r*Math.sin(a*i)]);
      return d3.line()(pts)+ 'Z';
    };

    const hexes = root.append('g').attr('class','hexgrid').selectAll('path.hex').data(centers).join('path')
      .attr('class','hex')
      .attr('d',d=>hexPath(d.x,d.y,hexR))
      .attr('fill', d=>color(0))              // initial
      .attr('stroke','rgba(255,255,255,.06)')
      .attr('opacity', .95);

    // Labels at raw points (optional)
    if (Hx.labelFmt){
      root.append('g').selectAll('text.mlbl').data(pts).join('text')
        .attr('class','mlbl')
        .attr('x',d=>d.proj[0]+8)
        .attr('y',d=>d.proj[1]-8)
        .attr('fill','var(--ink)')
        .attr('font-size','var(--fs-geoLabel, 12px)')
        .attr('font-weight',600)
        .text(d=> Hx.labelFmt(d));
    }

    root.node().__animateHexes = () => {
      const waveDelay = Hx.anim?.waveDelay || ((_,i)=> (i%cols) * 8);
      hexes.transition()
        .delay(waveDelay)
        .duration(dur(Hx.anim?.drawMs ?? 800))
        .attr('fill', d=>color(v(d)));
    };
  }

  // ---- PLUMES ----
  if (layers.plumes){
    const P = layers.plumes;
    const valKey = P.valueKey || 'value';
    const vals = (P.sites||[]).map(s => + (s[valKey] ?? s.footprint ?? s.disp ?? 0));
    const maxVal = d3.max(vals) || 1;
    const minR = P.minR ?? 24, maxR = P.maxR ?? 90;
    const valScale = v => Math.max(0, (v ?? 0) / maxVal);
    let colorScale = P.colorScale;
    if (!colorScale){
      if (Array.isArray(P.colorRange) && P.colorRange.length>=2){
        colorScale = d3.scaleLinear().domain([0,maxVal]).range(P.colorRange);
      }else{
        colorScale = v => d3.interpolateInferno(valScale(v));
      }
    }
    plumeLegend = { min: 0, max: maxVal, title: P.legend?.title, format: P.legend?.format, scale: colorScale };

    const defs = svg.append('defs');
    const siteData = (P.sites||[]).map((s,i) => {
      const id=`rg${Math.random().toString(36).slice(2)}${i}`;
      const grad=defs.append('radialGradient').attr('id',id);
      const stops = P.stops || [
        {offset:'0%', color:'rgba(255,255,255,.55)'},
        {offset:'60%', color:'rgba(255,255,255,0.16)'},
        {offset:'100%', color:'rgba(255,255,255,0)'}
      ];
      stops.forEach(st => grad.append('stop').attr('offset',st.offset).attr('stop-color',st.color));

      const p = projection([s.lon, s.lat]);
      const val = s[valKey] ?? s.footprint ?? s.disp ?? 0;
      const rFinal = minR + valScale(val) * (maxR - minR);
      const rInit = Math.max(10, rFinal * 0.55);

      const circle = root.append('circle')
        .attr('cx', p[0]).attr('cy', p[1])
        .attr('r', rInit)
        .attr('fill', `url(#${id})`)
        .attr('stroke', (typeof P.stroke === 'function' ? P.stroke(s) : (P.stroke ?? colorScale(val))))
        .attr('stroke-opacity', .35)
        .attr('stroke-dasharray', '6 8')
        .attr('stroke-width', 1.2)
        .attr('stroke-dashoffset', 20);

      let label = null;
      if (P.label?.show){
        const txt = (typeof P.label.text === 'function') ? P.label.text(s) : (P.label?.text || s.name);
        label = root.append('text')
          .attr('x', p[0] + rInit/2 + 6)
          .attr('y', p[1] - rInit/2 - 6)
          .attr('fill', P.label.color || 'var(--ink)')
          .attr('font-size', P.label.fontSize || 'var(--fs-geoLabel, 13px)')
          .attr('font-weight', P.label.weight || 600)
          .text(txt ?? '');
      }
      return { circle, label, rFinal, cx:p[0], cy:p[1] };
    });

    root.node().__animatePlumes = () => {
      siteData.forEach(({circle,label,rFinal,cx,cy})=>{
        circle.transition().duration(dur(P.anim?.growMs ?? 900)).ease(d3.easeCubicOut)
          .attr('r', rFinal)
          .on('end', function(){
            d3.select(this)
              .transition().duration(dur(P.anim?.dashMs ?? 1300))
              .attrTween('stroke-dashoffset', ()=> t => `${(1-t)*20}`);
          });
        if (label){
          label.transition().duration(dur(P.anim?.growMs ?? 900)).ease(d3.easeCubicOut)
            .attr('x', cx + rFinal/2 + 6)
            .attr('y', cy - rFinal/2 - 6);
        }
      });
    };
  }

  // ---- RINGS (animated dashed circles) ----
  if (layers.rings && Array.isArray(layers.rings.points)){
    const R = layers.rings;
    const ringG = root.append('g').attr('class','rings');
    const points = R.points;
    const rScale = R.rScale || (d3.scaleSqrt().domain([0, 10000]).range([6, 72]));
    const rings = ringG.selectAll('circle.ring').data(points).enter().append('circle')
      .attr('class','ring')
      .attr('cx', d => (projection([d.lon, d.lat]) || [null,null])[0])
      .attr('cy', d => (projection([d.lon, d.lat]) || [null,null])[1])
      .attr('r', d => d.r || rScale(d.value || 100))
      .attr('fill','none')
      .attr('stroke', R.stroke || 'var(--ink)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray','6 8');
    let timer;
    function startMotion(){
      if (timer) timer.stop();
      timer = d3.timer(t => {
        const sp = R.speed || 70;
        rings.attr('stroke-dashoffset', -(t / sp));
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && timer) timer.stop();
      if (!document.hidden) startMotion();
    });
    root.node().__startRings = startMotion;
  }

  // Legends
  const legendG = svg.append('g').attr('class','geo-legend');

  // Choropleth legend
  if (choroplethLegend){
    const { scale, domain, title, format } = choroplethLegend;
    const tickFmt = format === 'percent' ? fmtPercent : fmtDefault;
    const gradId = `grad-${Math.random().toString(36).slice(2,7)}`;
    const grad = defs.append('linearGradient').attr('id', gradId).attr('x1','0%').attr('x2','100%').attr('y1','0%').attr('y2','0%');
    const steps = 6;
    const d0 = domain[0], d1 = domain[domain.length-1];
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const v=d0 + (d1-d0)*t;
      grad.append('stop').attr('offset',`${t*100}%`).attr('stop-color', scale(v));
    }
    const legendWidth = 220, legendHeight = 12;
    const baseX = 24, baseY = H - 56;
    legendG.append('rect')
      .attr('x', baseX).attr('y', baseY)
      .attr('width', legendWidth).attr('height', legendHeight)
      .attr('fill', `url(#${gradId})`)
      .attr('stroke','rgba(255,255,255,0.2)');
    const axisScale = d3.scaleLinear().domain([d0,d1]).range([baseX, baseX+legendWidth]);
    const axis = d3.axisBottom(axisScale).ticks(4).tickSize(0).tickFormat(tickFmt);
    const axisG = legendG.append('g').attr('transform', `translate(0,${baseY + legendHeight})`).call(axis);
    axisG.selectAll('text').attr('fill','var(--muted)').attr('font-size','11px');
    axisG.selectAll('path,line').remove();
    legendG.append('text')
      .attr('x', baseX)
      .attr('y', baseY - 6)
      .attr('fill','var(--muted)')
      .attr('font-size','12px')
      .text(title || 'Choropleth');
  }

  // Bubble legend
  if (bubbleLegend){
    const { values, scale, title } = bubbleLegend;
    const baseX = W - 160, baseY = H - 30;
    const g = legendG.append('g').attr('class','bubble-legend').attr('transform', `translate(${baseX},${baseY})`);
    g.append('text')
      .attr('x', 0).attr('y', -scale(values[values.length-1]) - 28)
      .attr('fill','var(--muted)').attr('font-size','12px').text(title || 'Bubble size');
    values.slice().sort((a,b)=>b-a).forEach((v,i)=>{
      const r = scale(v);
      const cy = -r*2 - i*10;
      g.append('circle')
        .attr('cx', 0)
        .attr('cy', cy)
        .attr('r', r)
        .attr('fill','none')
        .attr('stroke','var(--muted)')
        .attr('stroke-width',1);
      g.append('text')
        .attr('x', r + 10)
        .attr('y', cy)
        .attr('dominant-baseline','middle')
        .attr('fill','var(--muted)')
        .attr('font-size','12px')
        .text(fmtDefault(v));
    });
  }

  // Plume legend
  if (plumeLegend){
    const { min, max, title, scale, format } = plumeLegend;
    const tickFmt = format === 'percent' ? fmtPercent : fmtDefault;
    const gradId = `plume-${Math.random().toString(36).slice(2,7)}`;
    const grad = defs.append('linearGradient').attr('id', gradId).attr('x1','0%').attr('x2','100%').attr('y1','0%').attr('y2','0%');
    const steps = 6;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const v=min + (max-min)*t;
      grad.append('stop').attr('offset',`${t*100}%`).attr('stop-color', scale(v));
    }
    const legendWidth = 200, legendHeight = 10;
    const baseX = W - legendWidth - 160, baseY = H - 56;
    legendG.append('rect')
      .attr('x', baseX).attr('y', baseY)
      .attr('width', legendWidth).attr('height', legendHeight)
      .attr('fill', `url(#${gradId})`)
      .attr('stroke','rgba(255,255,255,0.2)');
    const axisScale = d3.scaleLinear().domain([min,max]).range([baseX, baseX+legendWidth]);
    const axis = d3.axisBottom(axisScale).ticks(4).tickSize(0).tickFormat(tickFmt);
    const axisG = legendG.append('g').attr('transform', `translate(0,${baseY + legendHeight})`).call(axis);
    axisG.selectAll('text').attr('fill','var(--muted)').attr('font-size','11px');
    axisG.selectAll('path,line').remove();
    legendG.append('text')
      .attr('x', baseX)
      .attr('y', baseY - 6)
      .attr('fill','var(--muted)')
      .attr('font-size','12px')
      .text(title || 'Plume intensity');
  }

  // tail of js/charts/geo.js (replaced)
  const R = root.node();
  globalReveal({
    container: sel,
    fadeSel: root,
    ease: props.anim?.ease || d3.easeCubicOut,
    fadeMs: dur(props.anim?.fadeMs ?? 700),
    threshold: props.anim?.threshold ?? 0.45,
    animateFinal(){
      if(!R) return;
      const fns = ['__animateChoropleth','__animateBubbles','__animateFlow','__animateHexes','__animatePlumes','__startRings'];
      for (const fn of fns){
        const fx = R[fn];
        if (typeof fx === 'function'){
          try { fx(); } catch { /* no-op */ }
        }
      }
    }
  });
}
