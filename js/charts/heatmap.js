import { d3 } from '../deps.js';
import { createSVG, dur, dly, globalReveal } from '../core/utils.js';

export function build(sel, props){
  const W=1200,H=640,M={t:40,r:40,b:86,l:90};
  const svg=createSVG(sel,W,H);
  const g=svg.append('g').attr('transform',`translate(${M.l},${M.t})`);   // faded in globally

  const innerW=W-M.l-M.r, innerH=H-M.t-M.b;
  const months = props.months || d3.range(1,13), hours = props.hours || d3.range(0,24);
  const data=[]; months.forEach(m=>hours.forEach(h=> data.push({m,h,val: props.getVal? props.getVal(m,h): 0})));

  const x=d3.scaleBand().domain(months).range([0,innerW]).padding(0.05);
  const y=d3.scaleBand().domain(hours).range([0,innerH]).padding(0.05);
  const c=d3.scaleLinear().domain([0, d3.max(data,d=>d.val)||1]).range(['#1f2a44','#f79d65']);

  g.append('g').attr('transform',`translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickFormat(d=>d3.timeFormat('%b')(new Date(2025,d-1,1))))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'))
    .call(g=>g.selectAll('path').attr('stroke','var(--gridline)'));

  g.append('g')
    .call(d3.axisLeft(y).tickValues([0,6,12,18,23]))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'));

  g.append('text').attr('class','axis-title').attr('x',innerW/2).attr('y',innerH+60).attr('text-anchor','middle').text(props.xLabel||'Month');
  g.append('text').attr('class','axis-title').attr('transform',`translate(${-56},${innerH/2}) rotate(-90)`).attr('text-anchor','middle').text(props.yLabel||'Hour of Day');

  const cells=g.selectAll('rect').data(data).join('rect')
    .attr('x',d=>x(d.m))
    .attr('y',d=>y(d.h))
    .attr('width',x.bandwidth())
    .attr('height',y.bandwidth())
    .attr('rx',3)
    .attr('fill',c(0));  // initial

  globalReveal({
    container: sel,
    fadeSel: g,
    ease: d3.easeCubicOut,
    fadeMs: dur(700),
    animateFinal(){
      cells.transition().delay((_,i)=>dly(i*3)).duration(dur(900)).attr('fill',d=>c(d.val));
    }
  });
}
