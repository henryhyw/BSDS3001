import { d3 } from '../deps.js';
import { createSVG, dur, dly, globalReveal } from '../core/utils.js';

export function build(sel, props){
  const W=1200,H=600,M={t:30,r:24,b:88,l:70};
  const svg=createSVG(sel,W,H);
  const g=svg.append('g').attr('transform',`translate(${M.l},${M.t})`); // faded in globally

  const innerW=W-M.l-M.r, innerH=H-M.t-M.b;
  const x=d3.scaleLinear().domain([0, d3.max(props.values)*1.05]).nice().range([0,innerW]);
  const bins=d3.bin().domain(x.domain()).thresholds(props.thresholds||24)(props.values);
  const y=d3.scaleLinear().domain([0, d3.max(bins, d=>d.length)]).nice().range([innerH, 0]);

  g.append('g').attr('transform',`translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(12).tickSize(-innerH))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'))
    .call(g=>g.selectAll('line,path').attr('stroke','var(--gridline)'));

  g.append('g')
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'))
    .call(g=>g.selectAll('line,path').attr('stroke','var(--gridline)'));

  g.append('text').attr('class','axis-title').attr('x',innerW/2).attr('y',innerH+60).attr('text-anchor','middle')
    .text(props.xLabel||'Value');
  g.append('text').attr('class','axis-title').attr('transform',`translate(${-50},${innerH/2}) rotate(-90)`).attr('text-anchor','middle')
    .text(props.yLabel||'Count');

  const bars=g.selectAll('rect.bar').data(bins).join('rect').attr('class','bar')
    .attr('x',d=>x(d.x0)+1)
    .attr('y',y(0))
    .attr('width',d=>Math.max(0, x(d.x1)-x(d.x0)-2))
    .attr('height',0)
    .attr('rx',3)
    .attr('fill','rgba(247,178,103,.78)');

  globalReveal({
    container: sel,
    fadeSel: g,
    ease: d3.easeCubicOut,
    fadeMs: dur(700),
    animateFinal(){
      bars.transition()
        .delay((_,i)=>dly(i*40))
        .duration(dur(900))
        .attr('y',d=>y(d.length))
        .attr('height',d=>y(0)-y(d.length));
    }
  });
}
