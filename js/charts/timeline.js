import { d3 } from '../deps.js';
import { createSVG, dur, globalReveal } from '../core/utils.js';

export function build(sel, props){
  const W=1200,H=520,M={t:30,r:40,b:70,l:90};
  const svg=createSVG(sel,W,H);
  const g=svg.append('g').attr('transform',`translate(${M.l},${M.t})`); // globally faded

  const innerW=W-M.l-M.r, innerH=H-M.t-M.b;
  const items = props.items || [];

  const x=d3.scaleLinear().domain([0, props.xMax || d3.max(items,d=>d.max)]).range([0,innerW]);
  const y=d3.scaleBand().domain(items.map(d=>d.name)).range([0,innerH]).padding(.35);

  g.append('g').attr('transform',`translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(10).tickSize(-innerH))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'))
    .call(g=>g.selectAll('line,path').attr('stroke','var(--gridline)'));

  g.append('g')
    .call(d3.axisLeft(y).tickSize(0))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'));

  g.append('text').attr('class','axis-title').attr('x',innerW/2).attr('y',innerH+54).attr('text-anchor','middle').text('Months');
  g.append('text').attr('class','axis-title').attr('transform',`translate(${-56},${innerH/2}) rotate(-90)`).attr('text-anchor','middle').text('');

  const bars=g.append('g').selectAll('rect').data(items).join('rect')
    .attr('x',x(0)).attr('y',d=>y(d.name))
    .attr('width',0)
    .attr('height',y.bandwidth())
    .attr('rx',8)
    .attr('fill',d=>d.color || 'var(--ok)');

  globalReveal({
    container: sel,
    fadeSel: g,
    fadeMs: dur(700),
    ease: d3.easeCubicOut,
    animateFinal(){
      bars.transition().duration(dur(1600)).ease(d3.easeCubicOut).attr('width',d=>x(d.max)-x(0));
    }
  });
}
