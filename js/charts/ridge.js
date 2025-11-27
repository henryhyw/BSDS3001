import { d3 } from '../deps.js';
import { createSVG, dur, globalReveal } from '../core/utils.js';

export function build(sel, props){
  const W=1200,H=720,M={t:30,r:40,b:70,l:80};
  const svg=createSVG(sel,W,H);
  const g=svg.append('g').attr('transform',`translate(${M.l},${M.t})`); // globally faded

  const innerW=W-M.l-M.r, innerH=H-M.t-M.b;
  const isos = Object.keys(props.series);
  const x=d3.scaleLinear().domain(props.xDomain || d3.extent(props.series[isos[0]], d=>d.x)).range([0,innerW]);
  const yBand=d3.scaleBand().domain(isos).range([0,innerH]).paddingInner(.5);
  const yScale=d3.scaleLinear().domain([0,d3.max(isos,k=>d3.max(props.series[k], d=>d.y))]).range([0,yBand.bandwidth()*0.85]);

  g.append('g').attr('transform',`translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')).tickSize(-innerH))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'))
    .call(g=>g.selectAll('line,path').attr('stroke','var(--gridline)'));

  g.append('g')
    .call(d3.axisLeft(yBand).tickSize(0))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'));

  g.append('text').attr('class','axis-title').attr('x',innerW/2).attr('y',innerH+56).attr('text-anchor','middle').text('Year');

  const area=d3.area()
    .x(d=>x(d.x))
    .y0(d=>yBand(d.iso)+yBand.bandwidth())
    .y1(d=>yBand(d.iso)+yBand.bandwidth()-yScale(d.y))
    .curve(d3.curveCatmullRom.alpha(0.8));

  const data=isos.flatMap(iso=> props.series[iso].map(p => ({iso, x:p.x, y:p.y})));
  const groups=d3.group(data,d=>d.iso);

  const layer=g.append('g');
  groups.forEach((vals,iso)=>{
    layer.append('path')
      .datum(vals)
      .attr('fill', d3.interpolateCool((isos.indexOf(iso)+1)/(isos.length+1)))
      .attr('opacity', .95)
      .attr('d', area)
      .attr('transform','translate(0,20)');
  });

  const clip=svg.append('clipPath').attr('id',`rclip-${Math.random().toString(36).slice(2)}`)
    .append('rect').attr('x',0).attr('y',0).attr('width',0).attr('height',H);

  layer.attr('clip-path', `url(#${clip.node().parentNode.id})`);

  globalReveal({
    container: sel,
    fadeSel: g,
    fadeMs: dur(700),
    ease: d3.easeCubicOut,
    animateFinal(){
      clip.transition().duration(dur(2200)).ease(d3.easeCubicOut).attr('width',W);
    }
  });
}
